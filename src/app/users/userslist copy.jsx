import { useMemo, useState,useEffect } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import axios from 'axios';

//nested data is ok, see accessorKeys in ColumnDef below
{/*const data = [
  {
    name: {
      firstName: 'John',
      lastName: 'Doe',
    },
    address: '261 Erdman Ford',
    city: 'East Daphne',
    state: 'Kentucky',
  },
  {
    name: {
      firstName: 'Jane',
      lastName: 'Doe',
    },
    address: '769 Dominic Grove',
    city: 'Columbus',
    state: 'Ohio',
  },
  {
    name: {
      firstName: 'Joe',
      lastName: 'Doe',
    },
    address: '566 Brakus Inlet',
    city: 'South Linda',
    state: 'West Virginia',
  },
  {
    name: {
      firstName: 'Kevin',
      lastName: 'Vandy',
    },
    address: '722 Emie Stream',
    city: 'Lincoln',
    state: 'Nebraska',
  },
  {
    name: {
      firstName: 'Joshua',
      lastName: 'Rolluffs',
    },
    address: '32188 Larkin Turnpike',
    city: 'Charleston',
    state: 'South Carolina',
  },
];*/}

const Userslist = () => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect (() => {
        getData()
    },[])

    const getData = () => {
        axios.get('/api/users')
        .then(response =>{
            setData(response.data)
            setLoading(false)
        })
        .catch(err =>{
            console.log('Error',err)
        })
        
    }
  //should be memoized or stable
  const columns = useMemo(
    () => [

      {
        accessorKey: 'name',
        header: 'Name',
        size: 150,
      },
      {
        accessorKey: 'email', //normal accessorKey
        header: 'Email',
        size: 200,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        size: 150,
      },

    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data, //data must be memoized or stable (useState, useMemo, defined outside of this component, etc.)
  });

  return (
    <>
    {!loading &&(
        <MaterialReactTable table={table} />
    )}
    </>
  );
};

export default Userslist;
