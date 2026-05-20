/**
 * Phân tích lỗi từ Ethers.js / MetaMask → thông báo tiếng Việt + loại toast.
 * @returns {{ type: 'warning' | 'error' | 'info', message: string }}
 */
export const parseBlockchainError = (error) => {
  const code = normalizeErrorCode(error);
  const text = collectErrorText(error).toLowerCase();

  if (
    code === 4001 ||
    code === "4001" ||
    text.includes("user rejected") ||
    text.includes("user denied") ||
    text.includes("action_rejected") ||
    text.includes("rejected the request")
  ) {
    return {
      type: "warning",
      message:
        "⚠️ Giao dịch đã bị hủy: Bạn đã từ chối ký xác nhận trên ví MetaMask.",
    };
  }

  if (code === -32002 || code === "-32002") {
    return {
      type: "info",
      message:
        "⏳ Yêu cầu đang chờ: Vui lòng mở cửa sổ MetaMask để xử lý yêu cầu xác thực trước đó.",
    };
  }

  if (text.includes("insufficient funds for intrinsic transaction cost")) {
    return {
      type: "error",
      message:
        "⛽ Không đủ phí mạng: Bạn không đủ số dư coin nền tảng để chi trả phí gas cho mạng lưới này.",
    };
  }

  if (
    code === -32603 ||
    code === "-32603" ||
    text.includes("insufficient_funds") ||
    (text.includes("insufficient funds") &&
      !text.includes("intrinsic transaction cost"))
  ) {
    return {
      type: "error",
      message:
        "❌ Số dư không đủ: Tài khoản của bạn không đủ số dư để thực hiện giao dịch này.",
    };
  }

  if (text.includes("intrinsic gas too low") || text.includes("gas required exceeds")) {
    return {
      type: "error",
      message:
        "⛽ Không đủ phí mạng: Bạn không đủ số dư coin nền tảng để chi trả phí gas cho mạng lưới này.",
    };
  }

  if (text.includes("metamask is not installed")) {
    return {
      type: "error",
      message: "❌ Chưa cài MetaMask: Vui lòng cài tiện ích MetaMask để chuyển tiền.",
    };
  }

  if (text.includes("vi dang ket noi khong trung")) {
    return {
      type: "warning",
      message:
        "⚠️ Sai ví ký: Vui lòng chọn đúng ví gửi trong MetaMask hoặc đổi ví trong popup.",
    };
  }

  return {
    type: "error",
    message:
      "❌ Giao dịch thất bại: Đã xảy ra lỗi kỹ thuật trên mạng lưới. Vui lòng thử lại sau.",
  };
};

const normalizeErrorCode = (error) => {
  if (error?.code != null) return error.code;
  if (error?.info?.error?.code != null) return error.info.error.code;
  if (error?.error?.code != null) return error.error.code;
  if (error?.cause?.code != null) return error.cause.code;
  return null;
};

const collectErrorText = (error) => {
  const parts = [
    error?.message,
    error?.reason,
    error?.shortMessage,
    error?.info?.error?.message,
    error?.error?.message,
    error?.cause?.message,
    typeof error === "string" ? error : "",
  ].filter(Boolean);

  return parts.join(" ");
};
