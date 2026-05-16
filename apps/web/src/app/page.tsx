import { mockWorkbenchData } from "@tradeplaybook/mock-data";
import { TradePlaybookApp } from "../components/TradePlaybookApp";

export default function HomePage() {
  return <TradePlaybookApp initialData={mockWorkbenchData} />;
}
