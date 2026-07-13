import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../utils/auth_messages.dart';
import '../utils/require_auth.dart';
import '../utils/upload_limits.dart';
import '../theme.dart';

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
  bool _uploading = false;
  bool _twoFAEnabled = false;
  bool _twoFABusy = false;

  UploadLimits get _limits => context.read<AuthProvider>().uploadLimits;
  ApiService get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    final profile = context.read<AuthProvider>().user?['profile'] ?? {};
    _displayName = TextEditingController(text: profile['display_name'] ?? '');
    _bio = TextEditingController(text: profile['bio'] ?? '');
    _location = TextEditingController(text: profile['location'] ?? '');
    _website = TextEditingController(text: profile['website'] ?? '');
    _avatarUrl = TextEditingController(text: profile['avatar_url'] ?? '');
    _api.get2faStatus().then((s) {
      if (mounted) setState(() => _twoFAEnabled = s['enabled'] == true);
    }).catchError((_) {});
  }

  void _toast(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: error ? Colors.red.shade700 : null),
    );
  }

  Future<String?> _promptCode(String title) {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          maxLength: 6,
          autofocus: true,
          decoration: const InputDecoration(hintText: '6-digit code', counterText: ''),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, ctrl.text.trim()), child: const Text('Confirm')),
        ],
      ),
    );
  }

  Future<void> _enable2fa() async {
    setState(() => _twoFABusy = true);
    try {
      final setup = await _api.setup2fa();
      if (!mounted) return;
      final proceed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Set up two-factor'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('Add this key to an authenticator app (Google Authenticator, Authy), then confirm with a code.'),
            const SizedBox(height: 12),
            SelectableText(setup['secret'] ?? '', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: () { Clipboard.setData(ClipboardData(text: setup['secret'] ?? '')); _toast('Key copied'); },
              icon: const Icon(Icons.copy, size: 16), label: const Text('Copy key'),
            ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Next')),
          ],
        ),
      );
      if (proceed != true) return;
      final code = await _promptCode('Enter the 6-digit code');
      if (code == null || code.isEmpty) return;
      await _api.enable2fa(code);
      if (mounted) setState(() => _twoFAEnabled = true);
      _toast('Two-factor enabled');
    } on ApiException catch (e) {
      _toast(e.message, error: true);
    } finally {
      if (mounted) setState(() => _twoFABusy = false);
    }
  }

  Future<void> _disable2fa() async {
    final code = await _promptCode('Enter a code to disable 2FA');
    if (code == null || code.isEmpty) return;
    setState(() => _twoFABusy = true);
    try {
      await _api.disable2fa(code);
      if (mounted) setState(() => _twoFAEnabled = false);
      _toast('Two-factor disabled');
    } on ApiException catch (e) {
      _toast(e.message, error: true);
    } finally {
      if (mounted) setState(() => _twoFABusy = false);
    }
  }

  Future<void> _exportData() async {
    try {
      final data = await _api.exportMyData();
      await Clipboard.setData(ClipboardData(text: const JsonEncoder.withIndent('  ').convert(data)));
      _toast('Your data was copied to the clipboard');
    } catch (e) {
      _toast('Could not export your data', error: true);
    }
  }

  Future<void> _requestDeletion() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Request account deletion?'),
        content: const Text('Our team will process it. You can keep using ThriveHub until then.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade600),
            onPressed: () => Navigator.pop(ctx, true), child: const Text('Request')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _api.requestAccountDeletion();
      _toast('Deletion request received');
    } catch (e) {
      _toast('Could not submit request', error: true);
    }
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

  Future<void> _pickAvatar() async {
    if (!requireAuth(context, message: AuthMessages.uploadMedia)) return;
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked == null) return;

    setState(() => _uploading = true);
    try {
      final bytes = await picked.readAsBytes();
      final result = await context.read<AuthProvider>().api.uploadMedia(
            bytes,
            filename: picked.name,
            contentType: picked.mimeType ?? 'image/jpeg',
            limits: _limits,
            folder: 'avatars',
          );
      _avatarUrl.text = result['url'] ?? '';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Avatar uploaded')),
        );
      }
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

  Future<void> _save() async {
    if (!requireAuth(context, message: AuthMessages.editProfile)) return;
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
          decoration: const BoxDecoration(gradient: AppColors.heroGradient),
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
            OutlinedButton.icon(
              onPressed: _uploading ? null : _pickAvatar,
              icon: _uploading
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.photo_camera_outlined),
              label: Text(_uploading ? 'Uploading...' : 'Upload avatar photo'),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.bold)),
            ),

            const SizedBox(height: 28),
            const Divider(),
            const Padding(
              padding: EdgeInsets.only(top: 8, bottom: 4),
              child: Text('Security', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.shield_outlined, color: AppColors.primary),
              title: const Text('Two-factor authentication'),
              subtitle: Text(_twoFAEnabled ? 'On' : 'Off'),
              trailing: _twoFABusy
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : TextButton(
                      onPressed: _twoFAEnabled ? _disable2fa : _enable2fa,
                      child: Text(_twoFAEnabled ? 'Disable' : 'Enable'),
                    ),
            ),
            const Divider(),
            const Padding(
              padding: EdgeInsets.only(top: 8, bottom: 4),
              child: Text('Your data', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.download_outlined),
              title: const Text('Download my data'),
              subtitle: const Text('Copies a full JSON export to your clipboard'),
              onTap: _exportData,
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.delete_outline, color: Colors.red.shade600),
              title: Text('Request account deletion', style: TextStyle(color: Colors.red.shade600)),
              onTap: _requestDeletion,
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
