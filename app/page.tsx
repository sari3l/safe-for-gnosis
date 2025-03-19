'use client'
import { useState, useRef, useEffect } from "react";
import { getFunctionName, decodeFunction, OPERATION_TYPES } from '@/lib/function-decoder';
import { parseMultisendData } from '@/lib/multisend-decoder';
import type { 
  DecodedFunction, 
  DecodedParam, 
  Transaction,
  MultiSendTx 
} from '@/lib/function-decoder';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format } from "date-fns"

// 导入 shadcn/ui 组件
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast, Toaster } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const options = [
  { value: 'https://safe-transaction-arbitrum.safe.global', label:'arbitrum' },
  { value: 'https://safe-transaction-aurora.safe.global', label:'aurora' },
  { value: 'https://safe-transaction-avalanche.safe.global', label:'avalanche' },
  { value: 'https://safe-transaction-base.safe.global', label:'base' },
  { value: 'https://safe-transaction-base-sepolia.safe.global', label:'base-sepolia' },
  { value: 'https://safe-transaction-blast.safe.global', label:'blast' },
  { value: 'https://safe-transaction-bsc.safe.global', label:'bsc' },
  { value: 'https://safe-transaction-celo.safe.global', label:'celo' },
  { value: 'https://safe-transaction-mainnet.safe.global', label:'ethereum' },
  { value: 'https://safe-transaction-gnosis-chain.safe.global', label:'gnosis' },
  { value: 'https://safe-transaction-chiado.safe.global', label:'gnosis-chiado' },
  { value: 'https://safe-transaction-linea.safe.global', label:'linea' },
  { value: 'https://safe-transaction-mantle.safe.global', label:'mantle' },
  { value: 'https://safe-transaction-optimism.safe.global', label:'optimism' },
  { value: 'https://safe-transaction-polygon.safe.global', label:'polygon' },
  { value: 'https://safe-transaction-zkevm.safe.global', label:'polygon-zkevm' },
  { value: 'https://safe-transaction-scroll.safe.global', label:'scroll' },
  { value: 'https://safe-transaction-sepolia.safe.global', label:'sepolia' },
  { value: 'https://safe-transaction-worldchain.safe.global', label:'worldchain' },
  { value: 'https://safe-transaction-xlayer.safe.global', label:'xlayer' },
  { value: 'https://safe-transaction-zksync.safe.global', label:'zksync' },
]

interface ApiResponse {
  results: Transaction[];
}

export default function Home() {
  const [formData, setFormData] = useState<{ network: string; address: string; nonce: string }>({
    network: "https://safe-transaction-arbitrum.safe.global",
    address: "",
    nonce: "",
  });
  
  const [submittedData, setSubmittedData] = useState<{ network: string; address: string; nonce: string } | null>(null);
  const [responseData, setResponseData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<number | null>(null);
  const [functionNames, setFunctionNames] = useState<{ [key: number]: string }>({});
  const [decodedFunctions, setDecodedFunctions] = useState<{ [key: number]: DecodedFunction }>({});
  const [isWrapped, setIsWrapped] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // 点击外部关闭设置菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData({
      network: "https://safe-transaction-arbitrum.safe.global",
      address: "",
      nonce: "",
    });
    setResponseData(null);
    setExpandedData(null);
    setFunctionNames({});
    setDecodedFunctions({});
    setSubmittedData(null);
  };

  const validateForm = () => {
    if (!formData.address) {
      toast.error('Validation Error', {
        description: 'Please enter address'
      });
      return false;
    }
    
    // 如果 nonce 为空，显示确认对话框
    if (!formData.nonce) {
      setShowConfirmDialog(true);
      return false;
    }

    return true;
  };

  const handleConfirmedSubmit = () => {
    setShowConfirmDialog(false);
    // 执行提交操作
    submitForm();
  };

  const handleCancelSubmit = () => {
    setShowConfirmDialog(false);
    toast.error('Validation Error', {
      description: 'Please enter nonce'
    });
  };

  const submitForm = async () => {
    // 重置所有状态
    setResponseData(null);
    setError(null);
    setExpandedData(null);
    setFunctionNames({});
    setDecodedFunctions({});
    setSubmittedData(formData);
    setIsLoading(true);

    try {
      const url = `${formData.network}/api/v1/safes/${formData.address}/multisig-transactions/?nonce=${formData.nonce}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Safe not found or no transaction with this nonce');
        }
        throw new Error(`Request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.results.length === 0) {
        toast.error('No Data', {
          description: 'No transactions found with this nonce'
        });
        return;
      }
      
      setResponseData(data);
      
      // 为每个交易获取函数名称
      data.results.forEach(async (transaction: Transaction, index: number) => {
        const functionName = await getFunctionName(transaction.data);
        if (functionName && transaction.data) {
          // 设置函数名
          setFunctionNames(prev => ({
            ...prev,
            [index]: functionName
          }));

          // 先进行常规的函数解码
          const decodedFunction = await decodeFunction(transaction.data, functionName);
          if (decodedFunction) {
            // 设置解码结果
            setDecodedFunctions(prev => ({
              ...prev,
              [index]: decodedFunction
            }));

            console.log(functionName)

            // 如果是 multiSend 函数，进行额外的解析
            if (functionName.startsWith('multiSend')) {
              try {
                // 从已解码的函数中获取 transactions 参数
                const transactionsData = decodedFunction.params[0].value;

                console.log(transactionsData)
                // 解析 transactions 数据
                const decodedTransactions = await parseMultisendData(transactionsData);

                if (decodedTransactions.length > 0) {
                  // 更新解码结果，添加解析后的交易数据
                  setDecodedFunctions(prev => ({
                    ...prev,
                    [index]: {
                      ...prev[index],
                      params: [
                        {
                          name: 'transactions',
                          value: decodedTransactions.map(tx => ({
                            to: tx.sender,
                            data: tx.data,
                            decodedFunction: tx.decodedFunction
                          }))
                        }
                      ]
                    }
                  }));
                }
              } catch (err) {
                console.error('Parse multiSend data failed:', err);
              }
            }
          }
        }
      });
    } catch (err) {
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'Request Wrong'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 判断是否为 on-chain rejection
  const isOnChainRejection = (transactions: Transaction[]): boolean => {
    // 使用提交时的 nonce 值来判断
    if (!submittedData?.nonce) {
      return false;
    }
    
    if (!transactions || transactions.length <= 1) {
      return false;
    }
    
    // 获取第一个交易的 nonce
    const firstNonce = transactions[0].nonce;
    
    // 检查第一个交易的 nonce 是否在其他交易中出现
    return transactions.slice(1).some(tx => tx.nonce === firstNonce);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      if (!formData.nonce) {
        // 如果是因为 nonce 为空而返回 false，不做任何处理
        // Alert Dialog 会显示
        return;
      }
      // 其他验证错误
      return;
    }

    // 如果验证通过，直接提交
    await submitForm();
  };

  return (
    <div className="flex flex-col min-h-screen p-4">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Safe for Gnosis
          </h1>
          <Badge variant="outline" className="h-6">
            Beta
          </Badge>
        </div>
        
        <div className="mt-4 max-w-3xl">
          <p className="text-lg text-muted-foreground leading-relaxed">
            A powerful decoder for Safe (formerly Gnosis Safe) multi-signature wallet transactions. 
            Easily inspect and verify transaction details before signing.
          </p>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Multi-chain support with 20+ networks including Ethereum, Arbitrum, Optimism</span>
          </div>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Advanced decoding for complex transactions including MultiSend operations</span>
          </div>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Real-time signature tracking with detailed confirmation status</span>
          </div>
        </div>
      </div>

      <div className="flex space-x-6 items-start">
        {/* 左侧表单 */}
        <Card className="w-3/7">
          <CardHeader>
            <CardTitle>Transaction Decode</CardTitle>
            <CardDescription>
              Enter your SafeWallet transaction Information to see the decoded result
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Network</label>
                <Select
                  name="network"
                  value={formData.network}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, network: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="0xabcd..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Transaction ID</label>
                <Input
                  type="number"
                  name="nonce"
                  value={formData.nonce}
                  onChange={handleChange}
                  placeholder="1"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleReset}
                >
                  Reset
                </Button>
                <Button type="submit">
                  Check
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 右侧解析结果 */}
        <Card className="w-4/7">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Transaction Preview</CardTitle>
              {responseData && isOnChainRejection(responseData.results) && (
                <Badge variant="destructive">
                  On-chain rejection
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {submittedData ? (
              <div className="space-y-4">
                {isLoading && (
                  <Card>
                    <CardContent className="py-4">
                      <p>Loading...</p>
                    </CardContent>
                  </Card>
                )}

                {error && (
                  <Card>
                    <CardContent className="py-4 bg-red-50 text-red-700">
                      <p>{error}</p>
                    </CardContent>
                  </Card>
                )}

                {responseData && (
                  <div className="rounded">
                    {responseData.results.map((transaction, index) => {
                      return (
                        <Card key={index} className="mb-6">
                          <CardContent className="px-6">
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                <h3 className="text-l font-medium">
                                  Transaction {!submittedData?.nonce ? transaction.nonce : index + 1}
                                </h3>
                                <Badge variant={
                                  transaction.operation === 1 
                                    ? "delegate"
                                    : transaction.operation === 2 
                                      ? "create"
                                      : "success"
                                }>
                                  {OPERATION_TYPES[transaction.operation as keyof typeof OPERATION_TYPES]}
                                </Badge>
                              </div>
                              <div className="flex items-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant={
                                        transaction.confirmations.length >= transaction.confirmationsRequired 
                                          ? "success"
                                          : "wait"
                                      }>
                                        {transaction.confirmations.length} / {transaction.confirmationsRequired}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="p-0">
                                      <div className="bg-white rounded-lg shadow-lg border p-2 space-y-2">
                                        {transaction.confirmations.map((confirmation, i) => (
                                          <div key={i} className="text-xs">
                                            <a 
                                              href={`https://etherscan.io/address/${confirmation.owner}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:underline font-mono"
                                            >
                                              {confirmation.owner}
                                            </a>
                                            <div className="text-gray-500">
                                              {format(new Date(confirmation.submissionDate), 'yyyy-MM-dd HH:mm:ss')}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>

                            <div className="space-y-2 mb-4">
                              <div className="mt-1 space-y-1 text-sm">
                                <div className="grid grid-cols-5">
                                  <span className="col-span-1 font-semibold">To: </span>
                                  <span className="col-span-4 font-mono break-all">
                                    {transaction.to}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-1 space-y-1 text-sm">
                                <div className="grid grid-cols-5">
                                  <span className="font-semibold">Value: </span>
                                  <span className="font-mono break-all">{transaction.value}</span>
                                </div>
                              </div>
                              {transaction.data && (
                                <>
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <p className="font-semibold text-sm">Data:</p>
                                      <button 
                                        className="text-blue-600 text-xs hover:underline"
                                        onClick={() => setExpandedData(expandedData === index ? null : index)}
                                      >
                                        {expandedData === index ? 'Show Less' : 'Show Full Data'}
                                      </button>
                                    </div>
                                    <p className="font-mono text-sm break-all p-2 bg-gray-100 rounded">
                                      {expandedData === index
                                        ? transaction.data
                                        : transaction.data.slice(0, 66) + '...'}
                                    </p>
                                  </div>

                                  {functionNames[index] && (
                                    <div className="mt-4 p-2 bg-blue-50 rounded">
                                      <p className="font-medium text-sm mb-1 text-blue-700 break-all">
                                        Function: {functionNames[index]}
                                      </p>
                                      {decodedFunctions[index] && (
                                        <div className="mt-2">
                                          {decodedFunctions[index].params.map((param, pIndex) => (
                                            <div key={pIndex}>
                                              {param.name === 'transactions' ? (
                                                // multiSend 交易列表展示
                                                <div className="space-y-4 bg-white">
                                                  {(param.value as MultiSendTx[]).map((tx: MultiSendTx, txIndex: number) => (
                                                    <div key={txIndex} className="mt-4 pt-4 px-4 border border-gray-300 rounded">
                                                      <div className="flex justify-between items-center mb-3">
                                                        <h3 className="text-l font-semibold">Transaction {txIndex + 1}</h3>
                                                      </div>
                                                      <div className="space-y-2 mb-2">
                                                        <div className="grid grid-cols-5 text-sm">
                                                          <span className="col-span-1 font-semibold">To:</span>
                                                          <span className="col-span-4 font-mono break-all">
                                                            {tx.to}
                                                          </span>
                                                        </div>
                                                        {tx.data && (
                                                          <div>
                                                            <div className="flex justify-between items-center mb-1">
                                                              <p className="font-semibold text-sm">Data:</p>
                                                              <button 
                                                                className="text-blue-600 text-xs hover:underline"
                                                                onClick={() => {
                                                                  setExpandedData(prev => prev === txIndex ? null : txIndex);
                                                                }}
                                                              >
                                                                {expandedData === txIndex ? 'Show Less' : 'Show Full Data'}
                                                              </button>
                                                            </div>
                                                            <p className="font-mono text-sm break-all p-2 bg-gray-100 rounded">
                                                              {expandedData === txIndex ? tx.data : tx.data.slice(0, 66) + '...'}
                                                            </p>
                                                          </div>
                                                        )}
                                                        {tx.decodedFunction && (
                                                          <div className="mt-2 p-2 bg-blue-50 rounded">
                                                            <p className="text-sm font-medium text-blue-700">
                                                              Function: {tx.decodedFunction.name}({tx.decodedFunction.params.map((p: DecodedParam) => p.name).join(',')})
                                                            </p>
                                                            {tx.decodedFunction.params.map((p: DecodedParam, paramIndex: number) => (
                                                              <div key={paramIndex} className="grid grid-cols-5 text-sm mt-1">
                                                                <span className="col-span-1 font-semibold">
                                                                  {p.name}:
                                                                </span>
                                                                <span className="col-span-4 font-mono break-all">
                                                                  {p.value.toString()}
                                                                </span>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="grid grid-cols-5 text-sm mt-1">
                                                  <span className="col-span-1 font-semibold">
                                                    {param.name}:
                                                  </span>
                                                  <span className="col-span-4 font-mono break-all">
                                                    {param.value.toString()}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[324px] flex items-center justify-center">
                <p className="text-gray-500">Please enter the information you want to query on the left</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 原始响应数据部分 */}
      {responseData && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Raw Response Data</CardTitle>
              <div className="relative" ref={settingsRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-4 h-4 transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.113a7.047 7.047 0 010-2.228l-1.267-1.113a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Settings</span>
                </Button>

                {showSettings && (
                  <Card className="absolute right-0 mt-2 w-56 z-10">
                    <CardContent className="py-2">
                      <div className="flex items-center justify-between space-x-2">
                        <label className="text-sm font-medium">Auto Wrap</label>
                        <Switch
                          checked={isWrapped}
                          onCheckedChange={setIsWrapped}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className={`p-4 bg-gray-50 rounded ${isWrapped ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-x-auto'}`}>
              {JSON.stringify(responseData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>No nonce specified will fetch all transaction history. Do you want to continue?</p>
              <p className="text-orange-600">
                Transaction ID will use the transaction&apos;s own nonce. Please pay attention to identify them.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSubmit}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedSubmit}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster 
        richColors 
        position="top-right"
        expand={true}
        closeButton={true}
      />
    </div>
  );
}
