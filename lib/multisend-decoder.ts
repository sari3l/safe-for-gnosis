import { getFunctionName, decodeFunction } from '../lib/function-decoder';
import type { DecodedTransaction } from '../lib/function-decoder';

export async function parseMultisendData(multisendData: string): Promise<DecodedTransaction[]> {
  const transactions: DecodedTransaction[] = [];
  let index = 0;

  if (multisendData.startsWith('0x')) {
    multisendData = multisendData.slice(2);
  }

  try {
    while (index < multisendData.length) {
      // 解析发送方地址
      const sender = '0x' + multisendData.slice(index + 2, index + 42);
      const headerEnd = index + 0xaa;

      // 解析数据长度
      const dataLengthHex = multisendData.slice(index + 42, headerEnd);
      const dataLength = parseInt(dataLengthHex, 16) * 2;

      // 提取交易数据
      const dataStart = headerEnd;
      const dataEnd = dataStart + dataLength;
      const functionData = '0x' + multisendData.slice(dataStart, dataEnd);

      // 获取函数签名并解析
      const functionName = await getFunctionName(functionData);
      let decodedFunction;
      if (functionName) {
        decodedFunction = await decodeFunction(functionData, functionName);
      }

      transactions.push({
        sender,
        data: functionData,
        decodedFunction
      });

      // 移动到下一笔交易
      index = dataEnd;
    }

    return transactions;
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : '数据解析失败');
  }
} 