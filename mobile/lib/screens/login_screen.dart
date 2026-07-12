import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController(text: 'alex@thrivehub.com');
  final _password = TextEditingController(text: 'demo1234');
  bool _loading = false;
  String? _error;

  Future<void> _login() async {
    setState(() { _loading = true; _error = null; });
    try {
      await context.read<AuthProvider>().login(_email.text, _password.text);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final config = context.watch<AuthProvider>().config;
    final appName = config?['app_name'] ?? 'ThriveHub';

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFEEF2FF), Color(0xFFFDF2F8), Color(0xFFF0FDFA)],
          ),
        ),
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
                      gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFFEC4899), Color(0xFF14B8A6)]),
                    ),
                    child: const Center(child: Text('T', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold))),
                  ),
                  const SizedBox(height: 16),
                  Text(appName, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(config?['tagline'] ?? '', style: TextStyle(color: Colors.grey[600])),
                  const SizedBox(height: 32),
                  if (_error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(color: Colors.red[50], borderRadius: BorderRadius.circular(12)),
                      child: Text(_error!, style: const TextStyle(color: Colors.red)),
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
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Text(_loading ? 'Signing in...' : 'Sign In'),
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
