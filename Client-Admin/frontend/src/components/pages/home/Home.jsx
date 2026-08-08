import Chart from "../../chart/Chart";
import Featuredinfo from "../../featuredinfo/Featuredinfo";
import { UserData } from "../../../data";
import WidgetSmall from "../../widgetSmall/WidgetSmall";
import WidgetLarge from "../../widgetLarge/WidgetLarge";

function Home() {
  return (
    <div className="w-4/5 h-full">
      <Featuredinfo />
      <Chart title="تحلیل‌های کاربر" data={UserData} dataKey="کاربر" grid />
      <div className="flex m-5">
        <WidgetSmall />
        <WidgetLarge />
      </div>
    </div>
  );
}

export default Home;
