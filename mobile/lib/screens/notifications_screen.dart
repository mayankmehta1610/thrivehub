import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _items = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await context.read<AuthProvider>().api.getNotifications();
      if (mounted) setState(() => _items = data['items'] ?? []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markRead(String id) async {
    try {
      await context.read<AuthProvider>().api.markNotificationRead(id);
      await _load();
    } catch (_) {}
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
                          trailing: unread
                              ? const Icon(Icons.circle, size: 10, color: AppColors.accent)
                              : null,
                          onTap: unread ? () => _markRead(n['id']) : null,
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
