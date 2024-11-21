import { useState } from "react"
import Select from "react-select"
import { ToggleButton, ToggleButtonGroup } from "@mui/material"

const DropDown = ({ options, setOption, defaultValue, value, title }: {
    options: { label: string, value: any }[],
    setOption: (value: { label: string, value: any }) => void,
    defaultValue: { label: string, value: any },
    value: { label: string, value: any },
    title: string
}) => {
    return <div className='d-flex justify-content-between text-center vertical-align-middle m-2'>
        <span className='me-2 align-self-center'>{title}:</span>
        <Select
            options={options}
            onChange={(e) => setOption(e ?? defaultValue)}
            defaultValue={defaultValue}
            value={value}
        />
    </div>
}

const useContainerOptions = () => {
    const options = [
        { label: 'Body', value: 'body' },
        { label: 'IP', value: 'ip' },
    ]
    const [ optionInternal, setOption ] = useState(options[0]);
    const option = optionInternal.value;

    const setOptionInternal = (value: { label: string, value: string }) => setOption(value);

    const element = <DropDown options={options} defaultValue={options[0]} setOption={setOptionInternal} value={optionInternal} title='Container Type' />

    return { option, setOption: setOptionInternal, element }
}

const useRefreshOptions = () => {
    const options = [
        { label: 'Off', value: 0 },
        { label: '100ms', value: 100 },
        { label: '0.5s', value: 500 },
        { label: '1s', value: 1000 },
        { label: '5s', value: 5000 },
        { label: '10s', value: 10000 },
        { label: '30s', value: 30000 },
    ]
    const [ optionInternal, setOption ] = useState(options[4]);
    const option = optionInternal.value;

    const setOptionInternal = (value: { label: string, value: number }) => setOption(value);

    const element = <DropDown options={options} defaultValue={options[4]} setOption={setOptionInternal} value={optionInternal} title='Refresh every' />

    return { option, setOption: setOptionInternal, element }
}

const useInactiveOptions = () => {
    const [inactive, setInactive] = useState(false);

    const ToggleButtonInternal = ({ value, label }: { value: boolean, label: string }) => <ToggleButton
        value={value}
        sx={{
            color: '#808080',
            outline: '1px solid #444444',
            '&.Mui-selected': {
                color: '#ffffff',
                backgroundColor: '#444444',
                '&:hover': {
                    backgroundColor: '#555555'
                }
            }
        }}>
        {label}
    </ToggleButton>

    const element = <ToggleButtonGroup
        exclusive
        onChange={(_, value) => setInactive(inactive => value ?? inactive)}
        value={inactive}>
        <ToggleButtonInternal value={false} label='Only Active' />
        <ToggleButtonInternal value={true} label='All' />
    </ToggleButtonGroup>

    return { inactive, setInactive, element }
}

const useUpdateOptions = () => {
    const { option: containerType, element: containerOptions } = useContainerOptions();
    const { option: refreshSpeed, element: refreshOptions } = useRefreshOptions();
    const { inactive, element: inactiveOptions } = useInactiveOptions();

    const updateOptions = <div className='d-flex m-2' data-bs-theme='dark'>
        {containerOptions}
        {refreshOptions}
        {inactiveOptions}
    </div>

    return { containerType, refreshSpeed, updateOptions, inactive }
}

export default useUpdateOptions
