import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';

interface PhoneNumberInputProps {
    value: string;
    onChange: (value: string | undefined) => void;
    className?: string;
    required?: boolean;
}

export default function PhoneNumberInput({
    value,
    onChange,
    className,
    required = false,
}: PhoneNumberInputProps) {
    return (
        <PhoneInput
            international
            defaultCountry="BR"
            value={value}
            onChange={onChange}
            className={cn(
                'phone-input-custom',
                className
            )}
            numberInputProps={{
                className: 'flex-1 h-11 px-3 py-2 text-base border-0 focus:outline-none bg-transparent',
                required: required,
            }}
            countrySelectProps={{
                className: 'border-0 focus:outline-none bg-transparent cursor-pointer',
            }}
        />
    );
}
