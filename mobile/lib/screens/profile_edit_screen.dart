import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _displayName;
  late TextEditingController _bio;
  late TextEditingController _location;
  late TextEditingController _website;
  late TextEditingController _avatarUrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final profile = context.read<AuthProvider>().user?['profile'] ?? {};
    _displayName = TextEditingController(text: profile['display_name'] ?? '');
    _bio = TextEditingController(text: profile['bio'] ?? '');
    _location = TextEditingController(text: profile['location'] ?? '');
    _website = TextEditingController(text: profile['website'] ?? '');
    _avatarUrl = TextEditingController(text: profile['avatar_url'] ?? '');
  }

  @override
  void dispose() {
    _displayName.dispose();
    _bio.dispose();
    _location.dispose();
    _website.dispose();
    _avatarUrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await context.read<AuthProvider>().api.updateProfile({
        'display_name': _displayName.text,
        'bio': _bio.text,
        'location': _location.text,
        'website': _website.text,
        'avatar_url': _avatarUrl.text.isNotEmpty ? _avatarUrl.text : null,
      });
      await context.read<AuthProvider>().refreshUser();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated')),
        );
        Navigator.pop(context);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Profile'),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(colors: [Color(0xFF6366F1), Color(0xFFEC4899)]),
          ),
        ),
        foregroundColor: Colors.white,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _field(_displayName, 'Display Name', required: true),
            _field(_bio, 'Bio', maxLines: 3),
            _field(_location, 'Location'),
            _field(_website, 'Website'),
            _field(_avatarUrl, 'Avatar URL'),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366F1),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label, {int maxLines = 1, bool required = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: ctrl,
        maxLines: maxLines,
        validator: required ? (v) => (v == null || v.isEmpty) ? 'Required' : null : null,
        decoration: InputDecoration(
          labelText: label,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}
