import { TransactionAnalysis } from "../types";

function formatAnalysisResults(analysisResults: TransactionAnalysis) {
    const { gasSpent, txCount, uniqueAddresses, topAddresses } =
        analysisResults;
    const formatTopAddresses = (addresses: string[]) => {
        if (addresses.length === 0) return "None";
        return addresses
            .map((address, index) => `${index + 1}. ${address}`)
            .join("\n");
    };
    return `
      **Contract Analytics:**
  
      **Gas Spent:**
        - Last 1 Day: ${gasSpent["1d"]}
        - Last 7 Days: ${gasSpent["7d"]}
        - Last 30 Days: ${gasSpent["30d"]}
  
      **Transaction Count:**
        - Last 1 Day: ${txCount["1d"]}
        - Last 7 Days: ${txCount["7d"]}
        - Last 30 Days: ${txCount["30d"]}
  
      **Unique Addresses:**
        - Last 1 Day: ${uniqueAddresses["1d"]}
        - Last 7 Days: ${uniqueAddresses["7d"]}
        - Last 30 Days: ${uniqueAddresses["30d"]}
  
       **Top Addresses by Interactions:**
      - 1 Day:
${formatTopAddresses(topAddresses["1d"])}
      - 7 Days:
${formatTopAddresses(topAddresses["7d"])}
      - 30 Days:
${formatTopAddresses(topAddresses["30d"])}
    `;
}

export { formatAnalysisResults };
