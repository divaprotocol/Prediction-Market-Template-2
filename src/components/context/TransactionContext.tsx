import { createContext } from 'react';

interface TransactionStatus {
  success?: boolean;
  hash?: string;
}

const TransactionContext = createContext<{
  transactionStatus: TransactionStatus | null;
  setTransactionStatus: React.Dispatch<React.SetStateAction<TransactionStatus | null>>;
}>({
  transactionStatus: null,
  setTransactionStatus: () => {},
});

export default TransactionContext;