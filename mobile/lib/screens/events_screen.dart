import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../utils/auth_messages.dart';
import '../utils/require_auth.dart';
import '../theme.dart';
import 'event_detail_screen.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});
  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  List<dynamic> _items = [];
  bool _loading = true;
  final Set<String> _registering = {};

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await context.read<AuthProvider>().api.getEvents();
      if (mounted) setState(() => _items = data['items'] ?? []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _register(String id) async {
    if (!requireAuth(context, message: AuthMessages.registerEvent)) return;
    setState(() => _registering.add(id));
    try {
      await context.read<AuthProvider>().api.registerEvent(id);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("You're registered! 🎉")),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: Colors.red.shade700),
        );
      }
    } finally {
      if (mounted) setState(() => _registering.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_items.isEmpty) {
      return const Center(child: Text('No events yet', style: TextStyle(color: Colors.grey)));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        itemBuilder: (_, i) {
          final e = _items[i];
          final id = e['id'] as String;
          final capacity = e['capacity'];
          final count = e['participant_count'] ?? 0;
          final isFull = capacity != null && count >= capacity;
          final busy = _registering.contains(id);
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            clipBehavior: Clip.antiAlias,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: InkWell(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => EventDetailScreen(eventId: id)),
              ).then((_) => _load()),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (e['image_url'] != null)
                    CachedNetworkImage(imageUrl: e['image_url'], height: 140, width: double.infinity, fit: BoxFit.cover),
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(e['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                        const SizedBox(height: 4),
                        Row(children: [
                          const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
                          const SizedBox(width: 4),
                          Text(DateFormat.yMMMd().add_jm().format(DateTime.parse(e['start_at'])), style: const TextStyle(color: Colors.grey)),
                        ]),
                        if (e['venue'] != null) ...[
                          const SizedBox(height: 4),
                          Row(children: [const Icon(Icons.location_on, size: 14, color: Colors.grey), const SizedBox(width: 4), Expanded(child: Text(e['venue']))]),
                        ],
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('$count${capacity != null ? '/$capacity' : ''} going',
                                style: TextStyle(color: AppColors.teal, fontWeight: FontWeight.w600)),
                            if (e['is_registered'] == true)
                              const Chip(
                                avatar: Icon(Icons.check, size: 16, color: Colors.green),
                                label: Text('Registered'),
                                visualDensity: VisualDensity.compact,
                              )
                            else
                              ElevatedButton(
                                onPressed: (busy || isFull) ? null : () => _register(id),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.accent,
                                  foregroundColor: Colors.white,
                                  visualDensity: VisualDensity.compact,
                                ),
                                child: busy
                                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                    : Text(isFull ? 'Full' : 'Register'),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
