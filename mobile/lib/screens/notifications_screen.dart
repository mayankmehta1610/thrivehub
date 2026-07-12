import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _items = [];

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final data = await context.read<AuthProvider>().api.getNotifications();
    setState(() => _items = data['items'] ?? []);
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _items.length,
      itemBuilder: (_, i) {
        final n = _items[i];
        final unread = n['read_at'] == null;
        return Card(
          color: unread ? Colors.indigo[50] : null,
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: Icon(Icons.notifications, color: unread ? Colors.indigo : Colors.grey),
            title: Text(n['title'] ?? '', style: TextStyle(fontWeight: unread ? FontWeight.bold : FontWeight.normal)),
            subtitle: Text(n['body'] ?? ''),
          ),
        );
      },
    );
  }
}
