// Hàm tạo URL cho Avatar
export const getAvatarUrl = (originalUrl) => {
  if (!originalUrl) return "https://via.placeholder.com/150"; // Ảnh mặc định nếu lỗi

  // Chèn tham số cắt vuông, focus khuôn mặt, bo tròn tối đa
  return originalUrl.replace(
    "/upload/",
    "/upload/c_fill,g_face,w_150,h_150,r_max/",
  );
};

// Hàm tạo URL cho ảnh trong khung chat
export const getChatImageUrl = (originalUrl) => {
  if (!originalUrl) return "";

  // Chèn tham số giới hạn chiều rộng 800px, tự tối ưu dung lượng và định dạng
  return originalUrl.replace(
    "/upload/",
    "/upload/c_limit,w_800,q_auto,f_auto/",
  );
};
