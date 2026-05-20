import { useMemo } from "react";
import { getDefaultWallet } from "../../lib/walletService";
import {
  NETWORK_OPTIONS,
  getNetworkByKey,
  getNetworkSelectLabel,
} from "../../lib/supportedNetworks";

const CryptoTransferModal = ({
  isOpen,
  senderWallets,
  receiverWallets,
  selectedSenderWallet,
  selectedReceiverWallet,
  selectedNetwork,
  amount,
  onSenderWalletChange,
  onReceiverWalletChange,
  onNetworkChange,
  onAmountChange,
  onConfirm,
  onClose,
  isSubmitting,
  isSwitchingNetwork,
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
  const activeNetwork = useMemo(
    () => getNetworkByKey(selectedNetwork),
    [selectedNetwork],
  );

  if (!isOpen) return null;

  const isBusy = isSubmitting || isSwitchingNetwork;

  return (
    <div className="cryptoModalOverlay">
      <div className="cryptoModal">
        <h3>Chuyen {activeNetwork.currency}</h3>
        <label>
          Mang luoi
          <select
            value={selectedNetwork}
            onChange={(e) => onNetworkChange(e.target.value)}
            disabled={isBusy}
          >
            {NETWORK_OPTIONS.map((network) => (
              <option value={network.key} key={network.key}>
                {getNetworkSelectLabel(network)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Vi gui
          <select
            value={selectedSenderWallet || defaultSenderWallet}
            onChange={(e) => onSenderWalletChange(e.target.value)}
            disabled={isBusy}
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
          <button type="button" onClick={onAddNewWallet} disabled={isBusy}>
            Them vi moi
          </button>
          <button
            type="button"
            onClick={() => onSetDefaultWallet(selectedSenderWallet || defaultSenderWallet)}
            disabled={isBusy || !(selectedSenderWallet || defaultSenderWallet)}
          >
            Dat lam mac dinh
          </button>
        </div>
        <label>
          Vi nhan
          <select
            value={selectedReceiverWallet || defaultReceiverWallet}
            onChange={(e) => onReceiverWalletChange(e.target.value)}
            disabled={isBusy}
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
          So tien ({activeNetwork.currency})
          <input
            type="number"
            min="0"
            step="0.0001"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            disabled={isBusy}
          />
        </label>
        <div className="actions">
          <button type="button" onClick={onClose} disabled={isBusy}>
            Huy
          </button>
          <button type="button" onClick={onConfirm} disabled={isBusy}>
            {isSubmitting
              ? "Dang xu ly..."
              : isSwitchingNetwork
                ? "Dang chuyen mang..."
                : "Xac nhan chuyen khoan"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CryptoTransferModal;
