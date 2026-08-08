import { DataGrid } from "@mui/x-data-grid";
import { GoTrash } from "react-icons/go";
import { flexDirection, width } from "@mui/system";
import Paper from "@mui/material/Paper";
import { UserRows } from "../../../data";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function UserList() {
  const [data, setData] = useState(UserRows);

  const handledelete = (id) => {
    setData(data.filter((item) => item.id !== id));
  };

  const columns = [
    { field: "id", headerName: "ID", width: 100 },
    {
      field: "user",
      headerName: "نام و نام خانوادگی",
      width: 200,
      renderCell: (params) => {
        return (
          <div className="flex items-center">
            <img
              className="w-8 h-8 rounded-full ml-2.5 object-cover"
              src={params.row.avatar}
              alt="عکس"
              />
            {params.row.username}
          </div>
        );
      },
    },
    { field: "email", headerName: "ایمیل", width: 200 },
    { field: "products", headerName: "محصولات", width: 200 },
    {
      field: "status",
      headerName: "وضعیت",
      width: 200,
    },
    {
      field: "transaction",
      headerName: "تراکنش",
      width: 100,
    },
    {
      field: "action",
      headerName: "گزارش",
      width: 150,
      renderCell: (params) => {
        return (
          <div className="flex items-center">
            <Link to={`/users/${params.row.id}`}>
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
    <div className="w-full">
      <Paper sx={{ height: 800, width: "100%"}} className="flex">
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
      <Link className="no-underline flex justify-end" to="/newuser">
          <button className="w-20 bg-blue-700 text-white text-base font-['vazir'] border-none rounded-xl cursor-pointer p-1 ml-5 mt-5">
            ساختن
          </button>
        </Link>
    </div>
    
  );
}
