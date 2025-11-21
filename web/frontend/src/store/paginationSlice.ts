import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PageState {
  pageNumber: number;
  limit: number;
  filter?: string;
  search?: string;
}

interface PaginationState {
  [key: string]: PageState;
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
        ...state[action.payload.key],
        pageNumber: action.payload.pageNumber,
        limit: action.payload.limit,
      };
    },
    setPageState: (
      state,
      action: PayloadAction<{ 
        key: string; 
        pageNumber?: number; 
        limit?: number;
        filter?: string;
        search?: string;
      }>
    ) => {
      if (!state[action.payload.key]) {
        state[action.payload.key] = {
          pageNumber: 1,
          limit: 10,
        };
      }
      if (action.payload.pageNumber !== undefined) {
        state[action.payload.key].pageNumber = action.payload.pageNumber;
      }
      if (action.payload.limit !== undefined) {
        state[action.payload.key].limit = action.payload.limit;
      }
      if (action.payload.filter !== undefined) {
        state[action.payload.key].filter = action.payload.filter;
      }
      if (action.payload.search !== undefined) {
        state[action.payload.key].search = action.payload.search;
      }
    },
    resetPagination: (state, action: PayloadAction<string>) => {
      delete state[action.payload];
    },
  },
});

export const { setPagination, setPageState, resetPagination } = paginationSlice.actions;
export default paginationSlice.reducer;

