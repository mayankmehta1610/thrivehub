import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'communities_screen.dart';
import 'events_screen.dart';
import 'notifications_screen.dart';
import 'search_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;
  List<dynamic> _posts = [];
  bool _loading = true;
  final _postController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadFeed();
  }

  Future<void> _loadFeed() async {
    setState(() => _loading = true);
    try {
      final data = await context.read<AuthProvider>().api.getFeed();
      setState(() => _posts = data['items'] ?? []);
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _createPost() async {
    if (_postController.text.trim().isEmpty) return;
    await context.read<AuthProvider>().api.createPost(_postController.text);
    _postController.clear();
    _loadFeed();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final config = auth.config;
    final user = auth.user;

    final screens = [
      _buildFeed(),
      const CommunitiesScreen(),
      const EventsScreen(),
      const NotificationsScreen(),
      const SearchScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(config?['app_name'] ?? 'ThriveHub', style: const TextStyle(fontWeight: FontWeight.bold)),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(colors: [Color(0xFF6366F1), Color(0xFFEC4899)]),
          ),
        ),
        foregroundColor: Colors.white,
        actions: [
          CircleAvatar(
            backgroundImage: user?['profile']?['avatar_url'] != null
                ? CachedNetworkImageProvider(user!['profile']['avatar_url'])
                : null,
            child: user?['profile']?['avatar_url'] == null ? const Icon(Icons.person) : null,
          ),
          IconButton(icon: const Icon(Icons.logout), onPressed: () => auth.logout()),
          const SizedBox(width: 8),
        ],
      ),
      body: screens[_tab],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Feed'),
          NavigationDestination(icon: Icon(Icons.groups_outlined), selectedIcon: Icon(Icons.groups), label: 'Groups'),
          NavigationDestination(icon: Icon(Icons.event_outlined), selectedIcon: Icon(Icons.event), label: 'Events'),
          NavigationDestination(icon: Icon(Icons.notifications_outlined), selectedIcon: Icon(Icons.notifications), label: 'Alerts'),
          NavigationDestination(icon: Icon(Icons.search_outlined), selectedIcon: Icon(Icons.search), label: 'Search'),
        ],
      ),
    );
  }

  Widget _buildFeed() {
    return RefreshIndicator(
      onRefresh: _loadFeed,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  TextField(
                    controller: _postController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'Share your adventure...',
                      border: InputBorder.none,
                    ),
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: ElevatedButton(
                      onPressed: _createPost,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Post'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (_loading)
            const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
          else
            ..._posts.map((post) => _PostCard(post: post, onReact: _loadFeed)),
        ],
      ),
    );
  }
}

class _PostCard extends StatelessWidget {
  final dynamic post;
  final VoidCallback onReact;
  const _PostCard({required this.post, required this.onReact});

  @override
  Widget build(BuildContext context) {
    final author = post['author'];
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            leading: CircleAvatar(
              backgroundImage: author?['avatar_url'] != null ? CachedNetworkImageProvider(author['avatar_url']) : null,
            ),
            title: Text(author?['display_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('@${author?['username'] ?? ''}'),
          ),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text(post['body'] ?? '')),
          if (post['image_url'] != null)
            CachedNetworkImage(imageUrl: post['image_url'], width: double.infinity, fit: BoxFit.cover),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                IconButton(
                  icon: Icon(Icons.favorite, color: post['user_reacted'] == true ? Colors.pink : Colors.grey),
                  onPressed: () async {
                    await context.read<AuthProvider>().api.reactPost(post['id']);
                    onReact();
                  },
                ),
                Text('${post['reaction_count'] ?? 0}'),
                const SizedBox(width: 16),
                const Icon(Icons.comment_outlined, color: Colors.grey),
                Text(' ${post['comment_count'] ?? 0}'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
