import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }), // Change baseUrl to your backend URL if needed
  endpoints: (builder) => ({
    // Example endpoint for Admin Login
    adminLogin: builder.mutation<any, { username: string; password: string }>({
      query: (body) => ({
        url: '/admin/login',
        method: 'POST',
        body,
      }),
    }),
    // Add more endpoints here for your API list
  }),
});

export const { useAdminLoginMutation } = api; 