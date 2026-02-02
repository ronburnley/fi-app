import { Card, CurrencyInput } from '../ui';
import { useApp } from '../../context/AppContext';

export function ExpensesSection() {
  const { state, dispatch } = useApp();
  const { expenses } = state;

  const updateExpenses = (value: number) => {
    dispatch({
      type: 'UPDATE_EXPENSES',
      payload: { annualSpending: value },
    });
  };

  return (
    <Card title="Expenses">
      <CurrencyInput
        label="Annual Spending in Retirement"
        value={expenses.annualSpending}
        onChange={updateExpenses}
        hint="Your target annual spending, will be adjusted for inflation"
      />
    </Card>
  );
}
