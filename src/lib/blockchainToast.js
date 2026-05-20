import { toast } from "react-toastify";
import { parseBlockchainError } from "./parseBlockchainError";

export const TRANSFER_LOADING_TOAST_ID = "crypto-transfer-loading";

export const showTransferLoadingToast = () => {
  toast.loading("Đang khởi tạo giao dịch và chờ ký xác nhận trên MetaMask...", {
    toastId: TRANSFER_LOADING_TOAST_ID,
    isLoading: true,
    autoClose: false,
    closeOnClick: false,
  });
};

export const dismissTransferLoadingToast = () => {
  toast.dismiss(TRANSFER_LOADING_TOAST_ID);
};

export const showTransferSuccessToast = () => {
  toast.success("Chuyển tiền thành công! Đang đồng bộ hóa lên khung chat...", {
    toastId: "crypto-transfer-success",
    autoClose: 4000,
  });
};

/**
 * @param {{ type: 'warning' | 'error' | 'info', message: string }} parsed
 */
export const showParsedBlockchainToast = (parsed) => {
  const options = { autoClose: 6000, toastId: `crypto-transfer-${parsed.type}` };

  switch (parsed.type) {
    case "warning":
      toast.warning(parsed.message, options);
      break;
    case "info":
      toast.info(parsed.message, options);
      break;
    case "error":
    default:
      toast.error(parsed.message, options);
      break;
  }
};

export const showBlockchainErrorToast = (error) => {
  showParsedBlockchainToast(parseBlockchainError(error));
};
