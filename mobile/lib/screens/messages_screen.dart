import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../utils/auth_messages.dart';
import '../utils/require_auth.dart';

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

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final userId = user?['id'];

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Row(
      children: [
        SizedBox(
          width: 140,
          child: ListView.builder(
            itemCount: _conversations.length,
            itemBuilder: (context, i) {
              final c = _conversations[i];
              final participants = c['participants'] as List? ?? [];
              final name = participants.isNotEmpty
                  ? participants[0]['display_name'] ?? 'Chat'
                  : c['title'] ?? 'Chat';
              final selected = _selected?['id'] == c['id'];
              return ListTile(
                selected: selected,
                selectedTileColor: const Color(0xFFEEF2FF),
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
              ? const Center(child: Text('Select a conversation', style: TextStyle(color: Colors.grey)))
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
                                color: isOwn ? const Color(0xFF6366F1) : Colors.grey.shade100,
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
                            icon: const Icon(Icons.send, color: Color(0xFF6366F1)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
        ),
      ],
    );
  }
}
