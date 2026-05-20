import { useMemo } from "react";
import { getDefaultWallet } from "../../lib/walletService";

const CryptoTransferModal = ({
  isOpen,
  senderWallets,
  receiverWallets,
  selectedSenderWallet,
  selectedReceiverWallet,
  amount,
  onSenderWalletChange,
  onReceiverWalletChange,
  onAmountChange,
  onConfirm,
  onClose,
  isSubmitting,
  onAddNewWallet,
  onSetDefaultWallet,
}) => {
  const defaultSenderWallet = useMemo(
    () => getDefaultWallet(senderWallets)?.address ?? "",
    [senderWallets],
  );
  const defaultReceiverWallet = useMemo(
    () => getDefaultWallet(receiverWallets)?.address ?? "",
    [receiverWallets],
  );

  if (!isOpen) return null;

  return (
    <div className="cryptoModalOverlay">
      <div className="cryptoModal">
        <h3>Chuyen POL</h3>
        <label>
          Vi gui
          <select
            value={selectedSenderWallet || defaultSenderWallet}
            onChange={(e) => onSenderWalletChange(e.target.value)}
            disabled={isSubmitting}
          >
            {senderWallets.map((wallet) => (
              <option value={wallet.address} key={wallet.address}>
                {wallet.address}
                {wallet.isDefault ? " (Mac dinh)" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="walletActions">
          <button type="button" onClick={onAddNewWallet} disabled={isSubmitting}>
            Them vi moi
          </button>
          <button
            type="button"
            onClick={() => onSetDefaultWallet(selectedSenderWallet || defaultSenderWallet)}
            disabled={isSubmitting || !(selectedSenderWallet || defaultSenderWallet)}
          >
            Dat lam mac dinh
          </button>
        </div>
        <label>
          Vi nhan
          <select
            value={selectedReceiverWallet || defaultReceiverWallet}
            onChange={(e) => onReceiverWalletChange(e.target.value)}
            disabled={isSubmitting}
          >
            {receiverWallets.map((wallet) => (
              <option value={wallet.address} key={wallet.address}>
                {wallet.address}
                {wallet.isDefault ? " (Mac dinh)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          So tien (POL)
          <input
            type="number"
            min="0"
            step="0.0001"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            disabled={isSubmitting}
          />
        </label>
        <div className="actions">
          <button type="button" onClick={onClose} disabled={isSubmitting}>
            Huy
          </button>
          <button type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Dang xu ly..." : "Xac nhan chuyen khoan"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CryptoTransferModal;
