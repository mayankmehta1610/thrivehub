import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../utils/auth_messages.dart';
import '../utils/require_auth.dart';
import '../theme.dart';

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

  final Set<String> _joining = {};
  final Set<String> _joined = {};

  Future<void> _load() async {
    final data = await context.read<AuthProvider>().api.getCommunities(search: _search.isEmpty ? null : _search);
    setState(() => _items = data['items'] ?? []);
  }

  Future<void> _join(String slug) async {
    if (!requireAuth(context, message: AuthMessages.joinCommunity)) return;
    setState(() => _joining.add(slug));
    try {
      await context.read<AuthProvider>().api.joinCommunity(slug);
      if (mounted) {
        setState(() => _joined.add(slug));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Joined community 🎉')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: Colors.red.shade700),
        );
      }
    } finally {
      if (mounted) setState(() => _joining.remove(slug));
    }
  }

  @override
  Widget build(BuildContext context) {
    final config = context.watch<AuthProvider>().config;
    final categories = (config?['skill_categories'] as List?) ?? [];

    return Column(
      children: [
        if (categories.isNotEmpty)
          SizedBox(
            height: 110,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              itemCount: categories.length,
              itemBuilder: (_, i) {
                final cat = categories[i];
                return Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Stack(
                      children: [
                        if (cat['image_url'] != null)
                          CachedNetworkImage(
                            imageUrl: cat['image_url'],
                            width: 100,
                            height: 110,
                            fit: BoxFit.cover,
                          ),
                        Container(
                          width: 100,
                          height: 110,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                              colors: [Colors.black.withValues(alpha: 0.7), Colors.transparent],
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 8,
                          left: 8,
                          right: 8,
                          child: Text(
                            cat['label'] ?? '',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
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
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('${c['member_count'] ?? 0} members',
                                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
                              Builder(builder: (context) {
                                final slug = c['slug'] as String;
                                final busy = _joining.contains(slug);
                                final done = _joined.contains(slug);
                                return ElevatedButton.icon(
                                  onPressed: (busy || done) ? null : () => _join(slug),
                                  icon: Icon(done ? Icons.check : Icons.group_add, size: 16),
                                  label: Text(done ? 'Joined' : 'Join'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: done ? Colors.grey : AppColors.accent,
                                    foregroundColor: Colors.white,
                                    visualDensity: VisualDensity.compact,
                                  ),
                                );
                              }),
                            ],
                          ),
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
