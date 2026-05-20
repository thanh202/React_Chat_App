import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { readActiveNetworkKey, switchNetwork } from "../../lib/cryptoTransferService";
import {
  getNetworkByKey,
  getTransactionExplorerUrl,
  resolveNetworkKeyFromTransaction,
} from "../../lib/supportedNetworks";

const CryptoReceiptCard = ({ message, currentUserId }) => {
  const tx = message.transactionDetails ?? {};
  const networkKey = resolveNetworkKeyFromTransaction(tx);
  const networkLabel = tx.network ?? getNetworkByKey(networkKey).label;
  const explorerUrl = getTransactionExplorerUrl(networkKey, tx.txHash);
  const isReceiver = message.receiverId === currentUserId;

  const [chainMatches, setChainMatches] = useState(null);
  const [noMetaMask, setNoMetaMask] = useState(false);
  const [switching, setSwitching] = useState(false);

  const syncChain = useCallback(async () => {
    if (!isReceiver) {
      setChainMatches(true);
      setNoMetaMask(false);
      return;
    }

    if (typeof window === "undefined" || !window.ethereum) {
      setNoMetaMask(true);
      setChainMatches(true);
      return;
    }

    setNoMetaMask(false);

    try {
      const activeKey = await readActiveNetworkKey();
      setChainMatches(activeKey === networkKey);
    } catch {
      setChainMatches(false);
    }
  }, [isReceiver, networkKey]);

  useEffect(() => {
    void syncChain();
  }, [syncChain]);

  useEffect(() => {
    if (!isReceiver || typeof window === "undefined" || !window.ethereum) {
      return undefined;
    }

    const ethereum = window.ethereum;
    const onChainChanged = () => {
      void syncChain();
    };

    ethereum.on?.("chainChanged", onChainChanged);
    return () => {
      ethereum.removeListener?.("chainChanged", onChainChanged);
    };
  }, [isReceiver, syncChain]);

  const handleSwitchToTxNetwork = async () => {
    setSwitching(true);
    try {
      await switchNetwork(networkKey, {
        onSwitching: () =>
          toast.info("Đang yêu cầu chuyển mạng...", {
            toastId: `receipt-switch-${message.id}`,
          }),
        onAdding: () =>
          toast.info("Đang tự động thêm cấu hình mạng mới...", {
            toastId: `receipt-add-${message.id}`,
          }),
      });
      setChainMatches(true);
      toast.success(
        `Đã đồng bộ mạng lưới thành công! Số dư của bạn đã được cập nhật trên mạng ${networkLabel}.`,
        { toastId: `receipt-sync-ok-${message.id}` },
      );
    } catch (error) {
      toast.error(error?.message ?? "Không thể chuyển mạng");
    } finally {
      setSwitching(false);
    }
  };

  const showMismatchCta = isReceiver && !noMetaMask && chainMatches === false;
  const showChecking = isReceiver && !noMetaMask && chainMatches === null;

  const isFailed = tx.status === "failed";
  const isSuccess = tx.status === "success";
  const statusLabel = isSuccess
    ? "Thành công"
    : isFailed
      ? "Thất bại"
      : "Đang xử lý";

  const statusStyles = isSuccess
    ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/40"
    : isFailed
      ? "bg-red-500/20 text-red-100 ring-1 ring-red-400/50"
      : "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/35";

  const cardShellClass = isFailed
    ? "border-red-500/70 ring-2 ring-red-500/45 bg-gradient-to-br from-red-950/40 to-slate-900/95"
    : "border-white/15 bg-gradient-to-br from-slate-900/95 to-slate-800/90";

  return (
    <div
      className={`w-full max-w-[min(100%,22rem)] rounded-2xl border p-4 text-left shadow-xl shadow-black/30 backdrop-blur-sm ${cardShellClass}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold tracking-tight text-white">
          Biên lai chuyển tiền
        </h4>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${statusStyles}`}
        >
          {statusLabel}
        </span>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-slate-300">{message.content}</p>

      {isFailed && (
        <p className="mb-3 rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-[11px] font-medium leading-relaxed text-red-100">
          {tx.failureMessage ??
            "❌ Giao dịch thất bại trên mạng lưới. Vui lòng kiểm tra lại trên trình khám phá khối."}
        </p>
      )}

      <dl className="space-y-2 text-xs text-slate-200">
        <div className="flex justify-between gap-2 border-b border-white/10 pb-2">
          <dt className="shrink-0 text-slate-400">Mạng giao dịch</dt>
          <dd className="text-right font-medium text-cyan-200">{networkLabel}</dd>
        </div>
        <div className="flex justify-between gap-2 border-b border-white/10 pb-2">
          <dt className="shrink-0 text-slate-400">Số tiền</dt>
          <dd className="text-right font-mono text-white">
            {tx.amount} {tx.tokenSymbol}
          </dd>
        </div>
        <div className="break-all pt-1">
          <dt className="mb-0.5 text-slate-400">Từ</dt>
          <dd className="font-mono text-[11px] text-slate-300">{tx.fromAddress}</dd>
        </div>
        <div className="break-all">
          <dt className="mb-0.5 text-slate-400">Đến</dt>
          <dd className="font-mono text-[11px] text-slate-300">{tx.toAddress}</dd>
        </div>
      </dl>

      {isReceiver && noMetaMask && (
        <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-center text-[11px] leading-snug text-amber-100 ring-1 ring-amber-400/30">
          Cài đặt tiện ích MetaMask để đồng bộ đúng mạng và xem số dư chính xác trên ví của bạn.
        </p>
      )}

      {showChecking && (
        <p className="mt-3 animate-pulse text-center text-[11px] text-slate-400">
          Đang kiểm tra mạng ví của bạn…
        </p>
      )}

      {showMismatchCta && (
        <div className="mt-4 space-y-2 rounded-xl bg-violet-500/10 p-3 ring-2 ring-violet-400/50">
          <p className="text-center text-[11px] leading-relaxed text-violet-100">
            Giao dịch này nằm trên mạng{" "}
            <span className="font-semibold text-white">{networkLabel}</span>. Ví của bạn đang ở
            mạng khác — hãy chuyển sang đúng mạng để xem số dư và kiểm tra giao dịch.
          </p>
          <button
            type="button"
            disabled={switching}
            onClick={handleSwitchToTxNetwork}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-500 hover:to-fuchsia-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {switching ? (
              <>
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Đang xử lý…
              </>
            ) : (
              <>Bấm để nhận & chuyển sang mạng {networkLabel}</>
            )}
          </button>
        </div>
      )}

      {tx.txHash && explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-sky-400/40 bg-sky-500/10 py-2.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/20 hover:text-white"
        >
          Xem trên trình khám phá {networkLabel}
        </a>
      )}
    </div>
  );
};

export default CryptoReceiptCard;
