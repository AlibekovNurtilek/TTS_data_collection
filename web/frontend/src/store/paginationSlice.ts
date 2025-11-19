import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PaginationState {
  [key: string]: {
    pageNumber: number;
    limit: number;
  };
}

const initialState: PaginationState = {};

const paginationSlice = createSlice({
  name: 'pagination',
  initialState,
  reducers: {
    setPagination: (
      state,
      action: PayloadAction<{ key: string; pageNumber: number; limit: number }>
    ) => {
      state[action.payload.key] = {
        pageNumber: action.payload.pageNumber,
        limit: action.payload.limit,
      };
    },
    resetPagination: (state, action: PayloadAction<string>) => {
      delete state[action.payload];
    },
  },
});

export const { setPagination, resetPagination } = paginationSlice.actions;
export default paginationSlice.reducer;

