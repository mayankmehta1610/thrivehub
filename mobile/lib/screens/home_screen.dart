import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../utils/upload_limits.dart';
import 'communities_screen.dart';
import 'events_screen.dart';
import 'messages_screen.dart';
import 'notifications_screen.dart';
import 'profile_edit_screen.dart';
import 'search_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;
  List<dynamic> _posts = [];
  List<dynamic> _sponsors = [];
  bool _loading = true;
  bool _uploading = false;
  String? _pendingImageUrl;
  final _postController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadFeed();
  }

  Future<void> _loadFeed() async {
    setState(() => _loading = true);
    try {
      final api = context.read<AuthProvider>().api;
      final data = await api.getFeed();
      final sponsors = await api.getSponsorships(placement: 'feed_banner');
      setState(() {
        _posts = data['items'] ?? [];
        _sponsors = sponsors['items'] ?? [];
      });
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _createPost() async {
    if (_postController.text.trim().isEmpty) return;
    await context.read<AuthProvider>().api.createPost(
          _postController.text,
          imageUrl: _pendingImageUrl,
        );
    _postController.clear();
    setState(() => _pendingImageUrl = null);
    _loadFeed();
  }

  Future<void> _pickPostImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked == null) return;

    setState(() => _uploading = true);
    try {
      final auth = context.read<AuthProvider>();
      final limits = UploadLimits.fromConfig(auth.config);
      final bytes = await picked.readAsBytes();
      final result = await auth.api.uploadMedia(
        bytes,
        filename: picked.name,
        contentType: picked.mimeType ?? 'image/jpeg',
        limits: limits,
      );
      setState(() => _pendingImageUrl = result['url']);
    } on UploadValidationException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: Colors.red.shade700),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red.shade700),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
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
      const MessagesScreen(),
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
          GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileEditScreen())),
            child: CircleAvatar(
              backgroundImage: user?['profile']?['avatar_url'] != null
                  ? CachedNetworkImageProvider(user!['profile']['avatar_url'])
                  : null,
              child: user?['profile']?['avatar_url'] == null ? const Icon(Icons.person) : null,
            ),
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
          NavigationDestination(icon: Icon(Icons.chat_outlined), selectedIcon: Icon(Icons.chat), label: 'Messages'),
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
          if (_sponsors.isNotEmpty)
            Card(
              clipBehavior: Clip.antiAlias,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_sponsors[0]['image_url'] != null)
                    CachedNetworkImage(imageUrl: _sponsors[0]['image_url'], height: 100, width: double.infinity, fit: BoxFit.cover),
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Text('Sponsored · ${_sponsors[0]['sponsor_name'] ?? ''}',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  ),
                ],
              ),
            ),
          if (_sponsors.isNotEmpty) const SizedBox(height: 12),
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
                  if (_pendingImageUrl != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: CachedNetworkImage(imageUrl: _pendingImageUrl!, height: 120, width: double.infinity, fit: BoxFit.cover),
                      ),
                    ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        onPressed: _uploading ? null : _pickPostImage,
                        icon: _uploading
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.image_outlined),
                      ),
                      ElevatedButton(
                        onPressed: _createPost,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6366F1),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Post'),
                      ),
                    ],
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
      elevation: 0,
      color: Colors.white,
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
