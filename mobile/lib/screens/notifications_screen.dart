import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';
import 'event_detail_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _items = [];
  List<dynamic> _requests = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = context.read<AuthProvider>().api;
      final data = await api.getNotifications();
      List<dynamic> reqs = [];
      try { reqs = await api.getConnectionRequests(); } catch (_) {}
      if (mounted) setState(() { _items = data['items'] ?? []; _requests = reqs; });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _respond(String userId, bool accept) async {
    final api = context.read<AuthProvider>().api;
    try {
      if (accept) { await api.acceptConnection(userId); } else { await api.removeConnection(userId); }
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(accept ? 'Connected 🤝' : 'Request declined')),
        );
      }
    } catch (_) {}
  }

  Future<void> _markRead(String id) async {
    try {
      await context.read<AuthProvider>().api.markNotificationRead(id);
      await _load();
    } catch (_) {}
  }

  void _open(Map<String, dynamic> n) {
    if (n['read_at'] == null) _markRead(n['id']);
    final link = n['link'] as String?;
    if (link != null && link.startsWith('/events/')) {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => EventDetailScreen(eventId: link.substring('/events/'.length)),
      ));
    }
  }

  Future<void> _markAllRead() async {
    try {
      await context.read<AuthProvider>().api.markAllNotificationsRead();
      await _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    final hasUnread = _items.any((n) => n['read_at'] == null);
    return RefreshIndicator(
      onRefresh: _load,
      child: Column(
        children: [
          if (_requests.isNotEmpty)
            Card(
              margin: const EdgeInsets.all(12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFDDD6FE))),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Connection requests (${_requests.length})',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                    const SizedBox(height: 4),
                    ..._requests.map((r) {
                      final u = r['user'] ?? {};
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const CircleAvatar(child: Icon(Icons.person)),
                        title: Text(u['display_name'] ?? ''),
                        subtitle: const Text('wants to connect'),
                        trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                          ElevatedButton(
                            onPressed: () => _respond(u['id'], true),
                            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, visualDensity: VisualDensity.compact),
                            child: const Text('Accept'),
                          ),
                          IconButton(onPressed: () => _respond(u['id'], false), icon: const Icon(Icons.close, size: 20, color: Colors.grey)),
                        ]),
                      );
                    }),
                  ],
                ),
              ),
            ),
          if (hasUnread)
            Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                child: TextButton.icon(
                  onPressed: _markAllRead,
                  icon: const Icon(Icons.done_all, size: 18, color: AppColors.primary),
                  label: const Text('Mark all read', style: TextStyle(color: AppColors.primary)),
                ),
              ),
            ),
          Expanded(
            child: _items.isEmpty
                ? const Center(child: Text('No notifications yet', style: TextStyle(color: Colors.grey)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _items.length,
                    itemBuilder: (_, i) {
                      final n = _items[i];
                      final unread = n['read_at'] == null;
                      return Card(
                        color: unread ? const Color(0xFFF5F3FF) : null,
                        margin: const EdgeInsets.only(bottom: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: ListTile(
                          leading: Icon(Icons.notifications, color: unread ? AppColors.primary : Colors.grey),
                          title: Text(n['title'] ?? '', style: TextStyle(fontWeight: unread ? FontWeight.bold : FontWeight.normal)),
                          subtitle: Text(n['body'] ?? ''),
                          trailing: (n['link'] != null)
                              ? const Icon(Icons.chevron_right, color: Colors.grey)
                              : (unread ? const Icon(Icons.circle, size: 10, color: AppColors.accent) : null),
                          onTap: () => _open(Map<String, dynamic>.from(n)),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
