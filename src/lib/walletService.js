import {
  Timestamp,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export const normalizeWalletAddress = (address) => address?.toLowerCase() ?? "";

export const getDefaultWallet = (walletAddresses = []) => {
  if (!walletAddresses.length) return null;
  return walletAddresses.find((wallet) => wallet.isDefault) ?? walletAddresses[0];
};

export const getUserWallets = async (userId) => {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return [];
  }

  return userSnap.data().walletAddresses ?? [];
};

const computeNextWallets = ({
  currentWallets,
  newAddress,
  makeDefault,
  allowDuplicate,
}) => {
  const normalizedAddress = normalizeWalletAddress(newAddress);

  if (!normalizedAddress) {
    throw new Error("Wallet address is required");
  }
  const alreadyLinked = currentWallets.some(
    (wallet) => normalizeWalletAddress(wallet.address) === normalizedAddress,
  );

  const linkedAt = Timestamp.now();

  let nextWallets = currentWallets.map((wallet) => ({
    ...wallet,
    isDefault: makeDefault ? false : wallet.isDefault,
  }));

  if (alreadyLinked) {
    if (!allowDuplicate && !makeDefault) {
      return { nextWallets: currentWallets, alreadyLinked: true };
    }

    nextWallets = nextWallets.map((wallet) => {
      if (normalizeWalletAddress(wallet.address) !== normalizedAddress) {
        return wallet;
      }

      return {
        ...wallet,
        isDefault: makeDefault ? true : wallet.isDefault,
        linkedAt: wallet.linkedAt ?? linkedAt,
      };
    });
  } else {
    nextWallets.push({
      address: normalizedAddress,
      isDefault: makeDefault || currentWallets.length === 0,
      linkedAt,
    });
  }

  if (!nextWallets.some((wallet) => wallet.isDefault) && nextWallets.length) {
    nextWallets[0].isDefault = true;
  }

  return { nextWallets, alreadyLinked };
};

export const linkWalletAddress = async (userId, newAddress, makeDefault = true) => {
  const userRef = doc(db, "users", userId);

  const txResult = await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("User profile not found");
    }

    const currentWallets = userSnap.data().walletAddresses ?? [];
    const { nextWallets } = computeNextWallets({
      currentWallets,
      newAddress,
      makeDefault,
      allowDuplicate: true,
    });

    transaction.update(userRef, {
      walletAddresses: nextWallets,
      walletLinkedAt: serverTimestamp(),
    });

    return nextWallets;
  });

  return txResult;
};

export const addWalletAddressIfNotExists = async (userId, newAddress) => {
  const userRef = doc(db, "users", userId);

  const txResult = await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("User profile not found");
    }

    const currentWallets = userSnap.data().walletAddresses ?? [];
    const { nextWallets, alreadyLinked } = computeNextWallets({
      currentWallets,
      newAddress,
      makeDefault: false,
      allowDuplicate: false,
    });

    if (!alreadyLinked) {
      transaction.update(userRef, {
        walletAddresses: nextWallets,
        walletLinkedAt: serverTimestamp(),
      });
    }

    return { nextWallets: alreadyLinked ? currentWallets : nextWallets, alreadyLinked };
  });

  return txResult;
};

export const setDefaultWalletAddress = async (userId, addressToSetDefault) => {
  const normalizedTarget = normalizeWalletAddress(addressToSetDefault);
  if (!normalizedTarget) throw new Error("Wallet address is required");

  const userRef = doc(db, "users", userId);

  const txResult = await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("User profile not found");
    }

    const currentWallets = userSnap.data().walletAddresses ?? [];
    const exists = currentWallets.some(
      (wallet) => normalizeWalletAddress(wallet.address) === normalizedTarget,
    );
    if (!exists) {
      throw new Error("Wallet address not found in linked wallets");
    }

    const nextWallets = currentWallets.map((wallet) => ({
      ...wallet,
      isDefault: normalizeWalletAddress(wallet.address) === normalizedTarget,
    }));

    transaction.update(userRef, {
      walletAddresses: nextWallets,
      walletLinkedAt: serverTimestamp(),
    });

    return nextWallets;
  });

  return txResult;
};
