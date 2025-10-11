import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldTooltip } from '../components/FieldTooltip';
import { FormattedNumberInput } from '../components/FormattedNumberInput';

interface SovereignDebtFinancialFormProps {
  outstandingLoan: number;
  onUpdateOutstandingLoan: (value: number) => void;
}

export const SovereignDebtFinancialForm: React.FC<SovereignDebtFinancialFormProps> = ({
  outstandingLoan,
  onUpdateOutstandingLoan
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Information</CardTitle>
        <CardDescription>
          Enter the outstanding loan amount for sovereign debt calculations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
        <Label htmlFor="outstanding-loan">Outstanding Loan Amount (PKR)</Label>
            <FieldTooltip content="How much money is currently owed on the sovereign debt" />
          </div>
          <FormattedNumberInput
            id="outstanding-loan"
            placeholder="0"
            value={outstandingLoan || 0}
            onChange={onUpdateOutstandingLoan}
            className="mt-1"
          />
        </div>
      </CardContent>
    </Card>
  );
};
