import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../utils/auth_messages.dart';
import '../utils/require_auth.dart';
import '../theme.dart';

class EventDetailScreen extends StatefulWidget {
  final String eventId;
  const EventDetailScreen({super.key, required this.eventId});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  Map<String, dynamic>? _event;
  bool _loading = true;
  bool _registering = false;
  bool _registered = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await context.read<AuthProvider>().api.getEvent(widget.eventId);
      if (mounted) {
        setState(() {
          _event = data;
          if (data['is_registered'] == true) _registered = true;
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _register() async {
    if (!requireAuth(context, message: AuthMessages.registerEvent)) return;
    setState(() => _registering = true);
    try {
      await context.read<AuthProvider>().api.registerEvent(widget.eventId);
      await _load();
      if (mounted) {
        setState(() => _registered = true);
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
      if (mounted) setState(() => _registering = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final e = _event;
    final capacity = e?['capacity'];
    final count = e?['participant_count'] ?? 0;
    final isFull = capacity != null && count >= capacity;
    final organiser = e?['organiser'];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Event'),
        flexibleSpace: Container(decoration: const BoxDecoration(gradient: AppColors.heroGradient)),
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : e == null
              ? const Center(child: Text('Event not found'))
              : ListView(
                  children: [
                    if (e['image_url'] != null)
                      CachedNetworkImage(imageUrl: e['image_url'], height: 200, width: double.infinity, fit: BoxFit.cover),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(e['title'] ?? '', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          _infoRow(Icons.schedule, DateFormat.yMMMMEEEEd().add_jm().format(DateTime.parse(e['start_at']))),
                          if (e['venue'] != null) _infoRow(Icons.location_on, e['venue']),
                          _infoRow(Icons.people, '$count${capacity != null ? '/$capacity' : ''} registered'),
                          if (organiser != null) _infoRow(Icons.person, 'Organised by ${organiser['display_name'] ?? ''}'),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: (_registering || (isFull && !_registered)) ? null : _register,
                              icon: Icon(_registered ? Icons.check_circle : Icons.confirmation_num_outlined),
                              label: Text(_registered ? 'Registered' : isFull ? 'Event full' : 'Register'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                          const Text('About this event', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          Text(e['description'] ?? 'No description provided.',
                              style: TextStyle(color: Colors.grey.shade700, height: 1.5)),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.secondary),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 15))),
        ],
      ),
    );
  }
}
