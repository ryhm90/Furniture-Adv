"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import { useSession } from "next-auth/react";

export default function Signup() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  const [bonus, setBonus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canManageUsers = session?.user?.role?.toLowerCase() === "manager";

  const formatNumberWithCommas = (value) => {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setRole(selectedRole);

    if (["Owner", "Affiliate", "Customer", "Provider", "SECRETARY", "DOCTOR"].includes(selectedRole)) {
      setSalary("");
      setBonus("");
    }
  };

  const handleSalaryChange = (e) => {
    const value = e.target.value.replace(/,/g, "");
    if (!isNaN(value)) {
      setSalary(formatNumberWithCommas(value));
    }
  };

  const handleBonusChange = (e) => {
    const value = e.target.value.replace(/,/g, "");
    if (!isNaN(value)) {
      setBonus(formatNumberWithCommas(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post("/api/signup", {
        name,
        email,
        password,
        role,
        salary: salary.replace(/,/g, ""),
        bonus: bonus.replace(/,/g, ""),
      });

      if (response.data.success) {
        alert("User created successfully");
        router.push("/dashboard");
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Error:", error.response ? error.response.data : error.message);
      alert("Unable to create the user. Please review the submitted data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return <div className="mt-10 text-center">Loading...</div>;
  }

  if (!canManageUsers) {
    return (
      <div className="flex justify-center mt-16">
        <div className="max-w-md rounded-md bg-white p-8 text-center shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900">Restricted Page</h2>
          <p className="mt-4 text-sm text-gray-600">
            User creation is available to managers only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center mt-8">
      <div style={{ minWidth: "30%" }}>
        <div className="shadow-lg flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-white">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <div className="flex justify-center">
              <Image src="/login.gif" height={70} width={70} alt="Login Image" />
            </div>
            <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
              Create a user account
            </h2>
          </div>

          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                  Name
                </label>
                <div className="mt-2">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                  Password
                </label>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium leading-6 text-gray-900">
                  Confirm Password
                </label>
                <div className="mt-2">
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium leading-6 text-gray-900">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={role}
                  onChange={handleRoleChange}
                  className="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
                  <option value="">Select Role</option>
                  <option value="Affiliate">Affiliate</option>
                  <option value="Manager">Manager</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Sellor">Sellor</option>
                  <option value="Provider">Provider</option>
                  <option value="SECRETARY">SECRETARY</option>
                  <option value="DOCTOR">DOCTOR</option>
                  <option value="Owner">Owner</option>
                  <option value="Customer">Customer</option>
                </select>
              </div>

              {["Manager", "Accountant", "Sellor"].includes(role) && (
                <>
                  <div>
                    <label htmlFor="salary" className="block text-sm font-medium leading-6 text-gray-900">
                      Salary
                    </label>
                    <input
                      id="salary"
                      name="salary"
                      type="text"
                      value={salary}
                      onChange={handleSalaryChange}
                      className="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>

                  <div>
                    <label htmlFor="bonus" className="block text-sm font-medium leading-6 text-gray-900">
                      Bonus
                    </label>
                    <input
                      id="bonus"
                      name="bonus"
                      type="text"
                      value={bonus}
                      onChange={handleBonusChange}
                      className="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  {isSubmitting ? "Creating user..." : "Create user"}
                </button>
              </div>
            </form>

            <p className="mt-10 text-center text-sm text-gray-500">
              Done creating accounts?{" "}
              <span
                className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500 cursor-pointer"
                onClick={() => {
                  router.push("/");
                }}
              >
                Return to sign in
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
