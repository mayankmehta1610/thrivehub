import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});
  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  List<dynamic> _items = [];

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final data = await context.read<AuthProvider>().api.getEvents();
    setState(() => _items = data['items'] ?? []);
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _items.length,
      itemBuilder: (_, i) {
        final e = _items[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          clipBehavior: Clip.antiAlias,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
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
                      Row(children: [const Icon(Icons.location_on, size: 14, color: Colors.grey), const SizedBox(width: 4), Text(e['venue'])]),
                    ],
                    Text('${e['participant_count'] ?? 0} participants', style: TextStyle(color: Colors.teal[600])),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
