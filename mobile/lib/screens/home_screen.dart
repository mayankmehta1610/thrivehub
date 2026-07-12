import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../utils/auth_messages.dart';
import '../utils/require_auth.dart';
import '../utils/upload_limits.dart';
import '../theme.dart';
import 'communities_screen.dart';
import 'events_screen.dart';
import 'login_screen.dart';
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
    if (!requireAuth(context, message: AuthMessages.createPost)) return;
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
    if (!requireAuth(context, message: AuthMessages.uploadMedia)) return;
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked == null) return;

    setState(() => _uploading = true);
    try {
      final auth = context.read<AuthProvider>();
      final bytes = await picked.readAsBytes();
      final result = await auth.api.uploadMedia(
        bytes,
        filename: picked.name,
        contentType: picked.mimeType ?? 'image/jpeg',
        limits: auth.uploadLimits,
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
          decoration: const BoxDecoration(gradient: AppColors.heroGradient),
        ),
        foregroundColor: Colors.white,
        actions: [
          if (user != null) ...[
            GestureDetector(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfileEditScreen()),
              ),
              child: CircleAvatar(
                backgroundImage: user['profile']?['avatar_url'] != null
                    ? CachedNetworkImageProvider(user['profile']['avatar_url'])
                    : null,
                child: user['profile']?['avatar_url'] == null ? const Icon(Icons.person) : null,
              ),
            ),
            IconButton(icon: const Icon(Icons.logout), onPressed: () => auth.logout()),
          ] else
            IconButton(
              icon: const Icon(Icons.login),
              tooltip: 'Sign in',
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LoginScreen(returnOnSuccess: true)),
              ),
            ),
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
                          backgroundColor: AppColors.primary,
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
                    if (!requireAuth(context, message: AuthMessages.like)) return;
                    await context.read<AuthProvider>().api.reactPost(post['id']);
                    onReact();
                  },
                ),
                Text('${post['reaction_count'] ?? 0}'),
                const SizedBox(width: 16),
                InkWell(
                  onTap: () => showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => _CommentSheet(postId: post['id'], onChanged: onReact),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.comment_outlined, color: Colors.grey),
                    ],
                  ),
                ),
                Text(' ${post['comment_count'] ?? 0}'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CommentSheet extends StatefulWidget {
  final String postId;
  final VoidCallback onChanged;
  const _CommentSheet({required this.postId, required this.onChanged});

  @override
  State<_CommentSheet> createState() => _CommentSheetState();
}

class _CommentSheetState extends State<_CommentSheet> {
  List<dynamic> _comments = [];
  bool _loading = true;
  bool _posting = false;
  final _controller = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await context.read<AuthProvider>().api.getPostComments(widget.postId);
      if (mounted) setState(() => _comments = data['items'] ?? []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _post() async {
    if (!requireAuth(context, message: AuthMessages.comment)) return;
    if (_controller.text.trim().isEmpty) return;
    setState(() => _posting = true);
    try {
      await context.read<AuthProvider>().api.createComment(widget.postId, _controller.text.trim());
      _controller.clear();
      await _load();
      widget.onChanged();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red.shade700),
        );
      }
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        builder: (context, scrollController) => Column(
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Comments', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _comments.isEmpty
                      ? const Center(child: Text('No comments yet. Be the first!', style: TextStyle(color: Colors.grey)))
                      : ListView.builder(
                          controller: scrollController,
                          itemCount: _comments.length,
                          itemBuilder: (_, i) {
                            final c = _comments[i];
                            final author = c['author'];
                            return ListTile(
                              leading: CircleAvatar(
                                backgroundImage: author?['avatar_url'] != null
                                    ? CachedNetworkImageProvider(author['avatar_url'])
                                    : null,
                                child: author?['avatar_url'] == null ? const Icon(Icons.person, size: 18) : null,
                              ),
                              title: Text(author?['display_name'] ?? 'User',
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                              subtitle: Text(c['body'] ?? ''),
                            );
                          },
                        ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        decoration: InputDecoration(
                          hintText: 'Write a comment...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        ),
                        onSubmitted: (_) => _post(),
                      ),
                    ),
                    IconButton(
                      onPressed: _posting ? null : _post,
                      icon: _posting
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.send, color: AppColors.primary),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
