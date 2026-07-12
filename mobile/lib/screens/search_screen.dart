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

  Future<void> _search() async {
    if (_controller.text.trim().isEmpty) return;
    final data = await context.read<AuthProvider>().api.search(_controller.text);
    setState(() { _results = data['items'] ?? []; _searched = true; });
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
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                        foregroundColor: AppColors.primary,
                        child: Text((r['entity_type'] ?? '?')[0].toUpperCase()),
                      ),
                      title: Text(r['title'] ?? ''),
                      subtitle: Text('${r['entity_type']} · ${r['subtitle'] ?? ''}'),
                      trailing: isEvent ? const Icon(Icons.chevron_right) : null,
                      onTap: isEvent
                          ? () => Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => EventDetailScreen(eventId: r['id'])),
                              )
                          : null,
                    );
                  },
                )
              : const Center(child: Text('Search profiles, communities, events & posts')),
        ),
      ],
    );
  }
}
