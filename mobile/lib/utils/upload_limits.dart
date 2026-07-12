class UploadLimits {
  final int imageMaxBytes;
  final int videoMaxBytes;

  const UploadLimits({
    this.imageMaxBytes = 512000,
    this.videoMaxBytes = 2097152,
  });

  factory UploadLimits.fromConfig(Map<String, dynamic>? config) {
    final limits = config?['upload_limits'] as Map<String, dynamic>?;
    return UploadLimits(
      imageMaxBytes: _parseInt(limits?['image_max_bytes'], 512000),
      videoMaxBytes: _parseInt(limits?['video_max_bytes'], 2097152),
    );
  }

  static int _parseInt(dynamic value, int fallback) {
    if (value is int) return value;
    if (value is String) return int.tryParse(value) ?? fallback;
    return fallback;
  }
}

class UploadValidationException implements Exception {
  final String message;
  UploadValidationException(this.message);

  @override
  String toString() => message;
}

String? validateUploadSize({
  required String? contentType,
  required int sizeBytes,
  required UploadLimits limits,
}) {
  final type = contentType ?? '';
  if (type.startsWith('image/')) {
    if (sizeBytes > limits.imageMaxBytes) {
      return 'Image must be under 500KB';
    }
    return null;
  }
  if (type.startsWith('video/')) {
    if (sizeBytes > limits.videoMaxBytes) {
      return 'Video must be under 2MB';
    }
    return null;
  }
  return 'Only image and video files are allowed';
}
