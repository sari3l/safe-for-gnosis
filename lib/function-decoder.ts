import { Interface } from "ethers";

export interface OpenChainResponse {
  ok: boolean;
  result?: {
    function: {
      [key: string]: Array<{
        name: string;
        filtered: boolean;
      }>;
    };
  };
}

export interface DecodedParam {
  name: string;
  value: string | number | boolean | MultiSendTx[];
}

export interface DecodedFunction {
  name: string;
  params: DecodedParam[];
}

// 添加确认信息接口
export interface Confirmation {
  owner: string;
  submissionDate: string;
  transactionHash: string | null;
  signature: string;
  signatureType: string;
}

// 修改 Transaction 接口
export interface Transaction {
  to: string;
  value: string;
  data: string | null;
  nonce: number;
  operation: number;
  confirmations: Confirmation[];  // 修改为数组类型
  confirmationsRequired: number;
}

// 添加 operation 类型映射
export const OPERATION_TYPES = {
  0: 'Call',
  1: 'DelegateCall',
  2: 'Create'
} as const;

// 添加 DecodedTransaction 接口
export interface DecodedTransaction {
  sender: string;
  data: string;
  decodedFunction?: DecodedFunction;
}

// 添加 MultiSendTx 接口
export interface MultiSendTx {
  to: string;
  data: string;
  decodedFunction?: DecodedFunction;
}

export async function getFunctionName(data: string | null) {
  if (!data || data.length < 10) {
    return null;
  }

  try {
    const functionId = data.slice(0, 10);
    const response = await fetch(
      `https://api.openchain.xyz/signature-database/v1/lookup?function=${functionId}&filter=true`
    );

    if (!response.ok) {
      throw new Error('API请求失败');
    }

    const result: OpenChainResponse = await response.json();

    if (!result.ok || !result.result?.function[functionId]?.length) {
      return null;
    }

    return result.result.function[functionId][0].name;
  } catch (err) {
    console.error('获取函数名称失败:', err);
    return null;
  }
}

export async function decodeFunction(data: string, functionName: string) {
  try {
    const abi = ['function ' + functionName];
    const iface = new Interface(abi);
    const decoded = iface.decodeFunctionData(abi[0], data);

    // 从函数名中提取参数名
    const paramNames = functionName
      .slice(functionName.indexOf('(') + 1, functionName.indexOf(')'))
      .split(',')
      .map(param => {
        const [type, name] = param.trim().split(' ');
        return name || type;
      });

    // 将解码后的参数与参数名对应
    const params = decoded.toArray().map((value, i) => ({
      name: paramNames[i],
      value: value.toString()
    }));

    return {
      name: functionName.slice(0, functionName.indexOf('(')),
      params
    };
  } catch (err) {
    console.error('解析函数数据失败:', err);
    return undefined;
  }
} 