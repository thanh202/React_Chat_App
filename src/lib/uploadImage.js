const imageUploader = async (file) => {
  // Cấu hình Cloudinary của bạn
  const CLOUD_NAME = import.meta.env.VITE_CLOUD_NAME; // Thay bằng Cloud Name của bạn
  const UPLOAD_PRESET = import.meta.env.VITE_UPLOAD_PRESET; // Thay bằng Upload Preset Unsigned của bạn
  // Chuẩn bị dữ liệu để gửi đi
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  // Bạn có thể thêm folder để dễ quản lý (ví dụ: 'avatars' hoặc 'chat_images')
  formData.append("folder", "chat_app_images");

  try {
    // Gọi API của Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    const data = await response.json();

    if (data.secure_url) {
      console.log("Upload thành công! URL của ảnh:", data.secure_url);

      // TODO: Tại đây, bạn gửi data.secure_url lên Backend của bạn
      // Ví dụ: updateAvatar(data.secure_url) hoặc sendMessage(text, data.secure_url)
      return data.secure_url;
    }
  } catch (error) {
    console.error("Lỗi khi upload ảnh:", error);
    return error.message;
  }
};

export default imageUploader;
