import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../utils/auth_messages.dart';
import '../utils/require_auth.dart';
import '../theme.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  List<dynamic> _conversations = [];
  List<dynamic> _messages = [];
  dynamic _selected;
  bool _loading = true;
  final _msgController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  Future<void> _loadConversations() async {
    setState(() => _loading = true);
    try {
      final data = await context.read<AuthProvider>().api.getConversations();
      setState(() {
        _conversations = data['items'] ?? [];
        if (_conversations.isNotEmpty && _selected == null) {
          _selected = _conversations.first;
          _loadMessages(_selected['id']);
        }
      });
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _loadMessages(String convId) async {
    final data = await context.read<AuthProvider>().api.getMessages(convId);
    setState(() => _messages = (data['items'] as List?)?.reversed.toList() ?? []);
  }

  Future<void> _send() async {
    if (!requireAuth(context, message: AuthMessages.sendMessage)) return;
    if (_msgController.text.trim().isEmpty || _selected == null) return;
    await context.read<AuthProvider>().api.sendMessage(_selected['id'], _msgController.text);
    _msgController.clear();
    _loadMessages(_selected['id']);
    _loadConversations();
  }

  Future<void> _startNew() async {
    if (!requireAuth(context, message: AuthMessages.sendMessage)) return;
    final picked = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _NewConversationSheet(),
    );
    if (picked == null || !mounted) return;
    try {
      final api = context.read<AuthProvider>().api;
      final conv = picked['group'] == true
          ? await api.createGroupConversation(picked['title'], List<String>.from(picked['ids']))
          : await api.createConversation(picked['id']);
      await _loadConversations();
      final match = _conversations.firstWhere((c) => c['id'] == conv['id'], orElse: () => conv);
      setState(() => _selected = match);
      _loadMessages(match['id']);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red.shade700),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final userId = user?['id'];

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Stack(
      children: [
        Row(
          children: [
            SizedBox(
              width: 140,
              child: _conversations.isEmpty
                  ? const Center(child: Padding(padding: EdgeInsets.all(8), child: Text('No chats yet', style: TextStyle(color: Colors.grey, fontSize: 12), textAlign: TextAlign.center)))
                  : ListView.builder(
                      itemCount: _conversations.length,
                      itemBuilder: (context, i) {
                        final c = _conversations[i];
                        final participants = c['participants'] as List? ?? [];
                        final isGroup = c['type'] == 'group';
                        final name = isGroup
                            ? (c['title'] ?? 'Group')
                            : (participants.isNotEmpty ? participants[0]['display_name'] ?? 'Chat' : c['title'] ?? 'Chat');
                        final selected = _selected?['id'] == c['id'];
                        return ListTile(
                          selected: selected,
                          selectedTileColor: const Color(0xFFF5F3FF),
                          leading: isGroup ? const Icon(Icons.groups, color: AppColors.primary, size: 20) : null,
                          title: Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              maxLines: 1, overflow: TextOverflow.ellipsis),
                          subtitle: Text(c['last_message']?['body'] ?? '', maxLines: 1,
                              overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11)),
                          onTap: () {
                            setState(() => _selected = c);
                            _loadMessages(c['id']);
                          },
                        );
                      },
                    ),
            ),
            const VerticalDivider(width: 1),
            Expanded(
              child: _selected == null
                  ? const Center(child: Text('Start a conversation', style: TextStyle(color: Colors.grey)))
                  : Column(
                      children: [
                        Expanded(
                          child: ListView.builder(
                            padding: const EdgeInsets.all(12),
                            itemCount: _messages.length,
                            itemBuilder: (context, i) {
                              final m = _messages[i];
                              final isOwn = m['sender_id'] == userId;
                              return Align(
                                alignment: isOwn ? Alignment.centerRight : Alignment.centerLeft,
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  constraints: const BoxConstraints(maxWidth: 260),
                                  decoration: BoxDecoration(
                                    color: isOwn ? AppColors.primary : Colors.grey.shade100,
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Text(
                                    m['body'] ?? '',
                                    style: TextStyle(color: isOwn ? Colors.white : Colors.black87, fontSize: 14),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(8),
                          child: Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _msgController,
                                  decoration: InputDecoration(
                                    hintText: 'Type a message...',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  ),
                                  onSubmitted: (_) => _send(),
                                ),
                              ),
                              IconButton(
                                onPressed: _send,
                                icon: const Icon(Icons.send, color: AppColors.primary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
            ),
          ],
        ),
        Positioned(
          right: 16,
          bottom: 16,
          child: FloatingActionButton(
            backgroundColor: AppColors.accent,
            foregroundColor: Colors.white,
            onPressed: _startNew,
            child: const Icon(Icons.edit),
          ),
        ),
      ],
    );
  }
}

class _NewConversationSheet extends StatefulWidget {
  const _NewConversationSheet();

  @override
  State<_NewConversationSheet> createState() => _NewConversationSheetState();
}

class _NewConversationSheetState extends State<_NewConversationSheet> {
  final _controller = TextEditingController();
  final _groupName = TextEditingController();
  List<dynamic> _people = [];
  final List<Map<String, dynamic>> _selected = [];
  bool _groupMode = false;
  bool _loading = false;

  bool _isPicked(String id) => _selected.any((m) => m['id'] == id);
  void _toggle(Map<String, dynamic> p) {
    setState(() {
      if (_isPicked(p['id'])) {
        _selected.removeWhere((m) => m['id'] == p['id']);
      } else {
        _selected.add({'id': p['id'], 'name': p['title']});
      }
    });
  }

  Future<void> _search(String q) async {
    if (q.trim().length < 2) {
      setState(() => _people = []);
      return;
    }
    setState(() => _loading = true);
    try {
      final data = await context.read<AuthProvider>().api.search(q, entity: 'profiles');
      final items = (data['items'] as List? ?? []).where((r) => r['entity_type'] == 'profile').toList();
      if (mounted) setState(() => _people = items);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SizedBox(
        height: 480,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text(_groupMode ? 'New group' : 'New message', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(value: false, label: Text('Direct'), icon: Icon(Icons.person_outline)),
                  ButtonSegment(value: true, label: Text('Group'), icon: Icon(Icons.groups_outlined)),
                ],
                selected: {_groupMode},
                onSelectionChanged: (s) => setState(() => _groupMode = s.first),
              ),
            ),
            if (_groupMode)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: TextField(
                  controller: _groupName,
                  decoration: InputDecoration(
                    hintText: 'Group name (optional)',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
            if (_groupMode && _selected.isNotEmpty)
              Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Wrap(
                    spacing: 6,
                    children: _selected
                        .map((m) => Chip(
                              label: Text(m['name'] ?? ''),
                              onDeleted: () => _toggle({'id': m['id'], 'title': m['name']}),
                            ))
                        .toList(),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                controller: _controller,
                decoration: InputDecoration(
                  hintText: 'Search people by name...',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
                onChanged: _search,
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _people.isEmpty
                      ? const Center(child: Text('Type at least 2 characters', style: TextStyle(color: Colors.grey)))
                      : ListView.builder(
                          itemCount: _people.length,
                          itemBuilder: (_, i) {
                            final p = _people[i];
                            final picked = _isPicked(p['id']);
                            return ListTile(
                              leading: const CircleAvatar(child: Icon(Icons.person)),
                              title: Text(p['title'] ?? ''),
                              subtitle: Text(p['subtitle'] ?? ''),
                              trailing: _groupMode
                                  ? Icon(picked ? Icons.check_circle : Icons.radio_button_unchecked,
                                      color: picked ? AppColors.primary : Colors.grey)
                                  : null,
                              onTap: () => _groupMode
                                  ? _toggle(p)
                                  : Navigator.pop(context, {'id': p['id'], 'name': p['title']}),
                            );
                          },
                        ),
            ),
            if (_groupMode)
              Padding(
                padding: const EdgeInsets.all(12),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _selected.length < 2
                        ? null
                        : () => Navigator.pop(context, {
                              'group': true,
                              'title': _groupName.text.trim().isEmpty ? 'New group' : _groupName.text.trim(),
                              'ids': _selected.map((m) => m['id']).toList(),
                            }),
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
                    child: Text('Create group${_selected.isEmpty ? '' : ' (${_selected.length})'}'),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
