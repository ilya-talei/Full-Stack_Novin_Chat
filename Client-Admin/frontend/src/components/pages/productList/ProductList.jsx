import { DataGrid } from "@mui/x-data-grid";
import { GoTrash } from "react-icons/go";
import { flexDirection, width } from "@mui/system";
import Paper from "@mui/material/Paper";
import { ProductRows } from "../../../data";
import { Link } from "react-router-dom";
import { useState } from "react";

function ProductList() {
  const [data, setData] = useState(ProductRows);

  const handledelete = (id) => {
    setData(data.filter((item) => item.id !== id));
  };

  const columns = [
    { field: "id", headerName: "ID", width: 100 },
    {
      field: "product",
      headerName: "محصولات",
      width: 200,
      renderCell: (params) => {
        return (
          <div className="flex items-center">
            <img
              className="w-8 h-8 rounded-full ml-2.5 object-cover"
              src={params.row.img}
              alt="عکس"
            />
            {params.row.name}
          </div>
        );
      },
    },
    { field: "stock", headerName: "تعداد", width: 200 },
    {
      field: "status",
      headerName: "وضعیت",
      width: 200,
    },
    {
      field: "price",
      headerName: "قیمت",
      width: 100,
    },
    {
      field: "action",
      headerName: "گزارش",
      width: 150,
      renderCell: (params) => {
        return (
          <div className="flex items-center">
            <Link to={`/product/${params.row.id}`}>
              <button className="bg-emerald-400 text-white text-sm border-none rounded-xl cursor-pointer px-2.5 py-1.5 font-['vazir']">
                ویرایش
              </button>
            </Link>
            <GoTrash
              className="text-red-500 text-base mr-5 cursor-pointer"
              onClick={() => handledelete(params.row.id)}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="product flex-4">
      <Paper sx={{ height: 400, width: "100%" }}>
        <div className="flex-4 flex justify-end font-['vazir']">
          <DataGrid
            disableRowSelectionOnClick
            rows={data}
            columns={columns}
            pageSize={5}
            checkboxSelection
          />
        </div>
      </Paper>
    </div>
  );
}

export default ProductList;
