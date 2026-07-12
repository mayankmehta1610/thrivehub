import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class CommunitiesScreen extends StatefulWidget {
  const CommunitiesScreen({super.key});
  @override
  State<CommunitiesScreen> createState() => _CommunitiesScreenState();
}

class _CommunitiesScreenState extends State<CommunitiesScreen> {
  List<dynamic> _items = [];
  String _search = '';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final data = await context.read<AuthProvider>().api.getCommunities(search: _search.isEmpty ? null : _search);
    setState(() => _items = data['items'] ?? []);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Search communities...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
            ),
            onSubmitted: (v) { _search = v; _load(); },
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: _items.length,
            itemBuilder: (_, i) {
              final c = _items[i];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                clipBehavior: Clip.antiAlias,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (c['cover_url'] != null)
                      CachedNetworkImage(imageUrl: c['cover_url'], height: 120, width: double.infinity, fit: BoxFit.cover),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(c['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                          Text(c['description'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                          Text('${c['member_count'] ?? 0} members', style: TextStyle(color: Colors.indigo[400])),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
