import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';
import 'event_detail_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});
  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _controller = TextEditingController();
  List<dynamic> _results = [];
  bool _searched = false;
  Map<String, dynamic>? _explore;
  final Set<String> _requested = {};

  @override
  void initState() {
    super.initState();
    context.read<AuthProvider>().api.getExplore().then((d) {
      if (mounted) setState(() => _explore = d);
    }).catchError((_) {});
  }

  Future<void> _search() async {
    if (_controller.text.trim().isEmpty) return;
    final data = await context.read<AuthProvider>().api.search(_controller.text);
    setState(() { _results = data['items'] ?? []; _searched = true; });
  }

  Future<void> _connect(String username) async {
    setState(() => _requested.add(username));
    try {
      await context.read<AuthProvider>().api.requestConnection(username);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Connection request sent')));
      }
    } catch (e) {
      if (mounted) setState(() => _requested.remove(username));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  decoration: InputDecoration(
                    hintText: 'Search...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onSubmitted: (_) => _search(),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(onPressed: _search, child: const Text('Go')),
            ],
          ),
        ),
        Expanded(
          child: _searched
              ? ListView.builder(
                  itemCount: _results.length,
                  itemBuilder: (_, i) {
                    final r = _results[i];
                    final isEvent = r['entity_type'] == 'event';
                    final isProfile = r['entity_type'] == 'profile';
                    final username = (r['subtitle'] ?? '').toString().replaceFirst('@', '');
                    final requested = _requested.contains(username);
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                        foregroundColor: AppColors.primary,
                        child: Text((r['entity_type'] ?? '?')[0].toUpperCase()),
                      ),
                      title: Text(r['title'] ?? ''),
                      subtitle: Text('${r['entity_type']} · ${r['subtitle'] ?? ''}'),
                      trailing: isEvent
                          ? const Icon(Icons.chevron_right)
                          : isProfile
                              ? OutlinedButton.icon(
                                  onPressed: requested ? null : () => _connect(username),
                                  icon: Icon(requested ? Icons.check : Icons.person_add_alt, size: 16),
                                  label: Text(requested ? 'Sent' : 'Connect'),
                                )
                              : null,
                      onTap: isEvent
                          ? () => Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => EventDetailScreen(eventId: r['id'])),
                              )
                          : null,
                    );
                  },
                )
              : _buildExplore(),
        ),
      ],
    );
  }

  Widget _buildExplore() {
    final e = _explore;
    if (e == null) return const Center(child: CircularProgressIndicator());
    final people = (e['suggested_people'] as List?) ?? [];
    final comms = (e['popular_communities'] as List?) ?? [];
    final events = (e['upcoming_events'] as List?) ?? [];
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      children: [
        const Row(children: [Icon(Icons.explore, color: AppColors.primary, size: 20), SizedBox(width: 6),
          Text('Explore', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18))]),
        if (people.isNotEmpty) ...[
          const Padding(padding: EdgeInsets.only(top: 12, bottom: 6), child: Text('People to discover', style: TextStyle(fontWeight: FontWeight.w600))),
          SizedBox(
            height: 130,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: people.length,
              itemBuilder: (_, i) {
                final p = people[i];
                final uname = p['username'] ?? '';
                final requested = _requested.contains(uname);
                return Container(
                  width: 110,
                  margin: const EdgeInsets.only(right: 10),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFEDE9F5))),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const CircleAvatar(radius: 22, child: Icon(Icons.person)),
                    const SizedBox(height: 4),
                    Text(p['display_name'] ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    SizedBox(height: 26, child: OutlinedButton(
                      onPressed: requested ? null : () => _connect(uname),
                      style: OutlinedButton.styleFrom(padding: EdgeInsets.zero, visualDensity: VisualDensity.compact),
                      child: Text(requested ? 'Sent' : 'Connect', style: const TextStyle(fontSize: 11)),
                    )),
                  ]),
                );
              },
            ),
          ),
        ],
        if (events.isNotEmpty) ...[
          const Padding(padding: EdgeInsets.only(top: 16, bottom: 6), child: Text('Upcoming events', style: TextStyle(fontWeight: FontWeight.w600))),
          ...events.map((ev) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: const Icon(Icons.event, color: AppColors.primary),
              title: Text(ev['title'] ?? ''),
              subtitle: Text('${ev['participant_count'] ?? 0} going${ev['venue'] != null ? ' · ${ev['venue']}' : ''}'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => EventDetailScreen(eventId: ev['id']))),
            ),
          )),
        ],
        if (comms.isNotEmpty) ...[
          const Padding(padding: EdgeInsets.only(top: 16, bottom: 6), child: Text('Popular communities', style: TextStyle(fontWeight: FontWeight.w600))),
          ...comms.map((c) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: const Icon(Icons.groups, color: AppColors.primary),
              title: Text(c['name'] ?? ''),
              subtitle: Text('${c['member_count'] ?? 0} members'),
            ),
          )),
        ],
      ],
    );
  }
}
