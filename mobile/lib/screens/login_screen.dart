import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../utils/require_auth.dart';
import '../theme.dart';

class LoginScreen extends StatefulWidget {
  final bool returnOnSuccess;

  const LoginScreen({super.key, this.returnOnSuccess = false});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController(text: 'alex@thrivehub.com');
  final _password = TextEditingController(text: 'demo1234');
  bool _loading = false;
  bool _waking = false;
  String? _error;
  bool _unreachable = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final message = consumeAuthMessage();
      if (message != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: const Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    });
  }

  Future<void> _login() async {
    setState(() {
      _loading = true;
      _waking = false;
      _error = null;
      _unreachable = false;
    });

    try {
      await context.read<AuthProvider>().login(
        _email.text,
        _password.text,
        onWakeStatus: (_) {
          if (mounted) setState(() => _waking = true);
        },
      );
      if (!mounted) return;
      if (widget.returnOnSuccess) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().replaceFirst('Exception: ', '');
      setState(() {
        _error = msg;
        _unreachable = e is NetworkException;
      });
    } finally {
      if (mounted) setState(() {
        _loading = false;
        _waking = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final config = context.watch<AuthProvider>().config;
    final appName = config?['app_name'] ?? 'ThriveHub';

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.softBackground),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Container(
                    width: 72, height: 72,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      gradient: AppColors.heroGradient,
                    ),
                    child: const Center(child: Text('T', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold))),
                  ),
                  const SizedBox(height: 16),
                  Text(appName, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(config?['tagline'] ?? '', style: TextStyle(color: Colors.grey[600])),
                  const SizedBox(height: 32),
                  if (_waking)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5F3FF),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE9D5FF)),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                          ),
                          SizedBox(width: 8),
                          Text('Waking up server...', style: TextStyle(color: Color(0xFF6D28D9))),
                        ],
                      ),
                    ),
                  if (_error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(color: Colors.red[50], borderRadius: BorderRadius.circular(12)),
                      child: Column(
                        children: [
                          Text(_error!, style: const TextStyle(color: Colors.red)),
                          if (_unreachable) ...[
                            const SizedBox(height: 8),
                            SizedBox(
                              width: double.infinity,
                              child: TextButton(
                                onPressed: _loading ? null : _login,
                                style: TextButton.styleFrom(
                                  backgroundColor: Colors.red[100],
                                  foregroundColor: Colors.red[800],
                                ),
                                child: const Text('Try again'),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(16))), filled: true, fillColor: Colors.white)),
                  const SizedBox(height: 12),
                  TextField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(16))), filled: true, fillColor: Colors.white)),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity, height: 52,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _login,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF43F5E),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Text(_waking ? 'Waking up server...' : _loading ? 'Signing in...' : 'Sign In'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
