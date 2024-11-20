export const Button = (props: any) => {
    const defaultClassName = 'btn btn-sm btn-outline-secondary m-1';
    const className = props.className ? props.className + ' ' + defaultClassName : defaultClassName;
    return <button {...props} className={className} />;
}
