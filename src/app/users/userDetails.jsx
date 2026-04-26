import React from "react";
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';    
import { useEffect,useState } from "react";
import InputLabel from '@mui/material/InputLabel';
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import Button from '@mui/material/Button';
import { toast } from 'react-toastify';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const schema = yup
  .object({
    name: yup.string().required("Please Enter Name!"),
    email: yup.string().email().required("Please Enter Email!"),
  })
  .required()

export default function UserDetails({handleIsAddClose , rows}) {
    const [utype, setUtype] = useState('User');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const {register,handleSubmit,reset,formState: { errors },} = useForm({
        resolver: yupResolver(schema)
      })
      useEffect(() => {
        if (rows){
          setUtype(rows.type)
          reset({
            id: rows.id,
            name: rows.name,
            email: rows.email,
          })
        }
      },[reset, rows])
      const onSubmit = (data) => {
        Object.assign(data, { type: utype})


        if (rows){
          setIsSubmitting(true);
          axios.put(`/api/users`, { ...data, id: rows.id })
        .then(() =>{
            toast.success('Edit Complete!', {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light",
            });
            handleIsAddClose()
        })
        .catch(err => {
            console.log('Error', err);
            toast.error('Error editing data', {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light",
            });
        })
        .finally(() => {
            setIsSubmitting(false);
        });
        } else {
          setIsSubmitting(true);
          axios.post(`/api/users`, data)
        .then(() =>{
            toast.success('Data Added!', {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light",
            });
            handleIsAddClose()
        })
        .catch(err => {
            console.log('Error', err);
            toast.error('Error adding data', {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light",
            });
        })
        .finally(() => {
            setIsSubmitting(false);
        });
        }
      }

    const handleChange = (event) => {
        setUtype(event.target.value);
    };
    return(
        <>
        <div className="flex justify-start">
                <ArrowBackIcon  className="mr-2 cursor-pointer" onClick={() => handleIsAddClose()}/>
                <h2 className="font-bold mb-4">Add User</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-5">
            <div>
            <TextField fullWidth size="small" label="Name" variant="outlined" {...register("name")}/>
            <p className="text-orange-600 ml-1 text-xs">{errors.name?.message}</p>
            </div>
            <div>
            <TextField fullWidth size="small" label="Email" variant="outlined" {...register("email")}/>
            <p className="text-orange-600 ml-1 text-xs">{errors.email?.message}</p>
            </div>
            <div>
            <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                value={utype}
                label="Type"
                size="small"
                onChange={handleChange}
                >
                <MenuItem value="User">User</MenuItem>
                <MenuItem value="Manager">Manager</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
                </Select>
            </FormControl>
            </div>
             </div>
                <div className="mt-2 flex justify-end">
                <Button variant="outlined" className="mb-2" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                </Button>
                </div>
        </form>
        </>
    )
}
