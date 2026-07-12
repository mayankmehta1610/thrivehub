import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'screens/home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ThriveHubApp());
}

class ThriveHubApp extends StatelessWidget {
  const ThriveHubApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider()..init(),
      child: MaterialApp(
        title: 'ThriveHub',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF6366F1),
            secondary: const Color(0xFFEC4899),
            tertiary: const Color(0xFF14B8A6),
          ),
          textTheme: GoogleFonts.interTextTheme(),
          useMaterial3: true,
        ),
        home: Consumer<AuthProvider>(
          builder: (context, auth, _) {
            if (auth.loading) {
              return const Scaffold(body: Center(child: CircularProgressIndicator()));
            }
            return const HomeScreen();
          },
        ),
      ),
    );
  }
}
