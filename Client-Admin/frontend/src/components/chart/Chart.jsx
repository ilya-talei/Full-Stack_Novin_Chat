import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { RechartsDevtools } from "@recharts/devtools";

// #endregion

export default function Chart({ title, data, dataKey, grid }) {
  return (
    <div className="my-5 mx-5 shadow-lg">
      <h3 className="font-['vazir'] p-5">{title}</h3>
      <LineChart
        className="h-96 w-full font-['vazir'] px-2"
        style={{
          direction: "ltr",
          aspectRatio: 1.618,
        }}
        responsive
        data={data}
        margin={{
          top: 5,
          right: 0,
          left: 0,
          bottom: 5,
        }}
      >
        {grid && <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F2" />}
        <XAxis dataKey="name" stroke="#36383F" />
        <YAxis width="auto" stroke="#36383F" />
        <Tooltip
          cursor={{
            stroke: "#F2F2F2",
          }}
          contentStyle={{
            backgroundColor: "#F2F2F2",
            borderColor: "#F2F2F2",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke="#52489C"
          dot={{
            fill: "#5D3FD3",
          }}
          activeDot={{ r: 8, stroke: "#7F00FF" }}
        />
        <RechartsDevtools />
      </LineChart>
    </div>
  );
}
