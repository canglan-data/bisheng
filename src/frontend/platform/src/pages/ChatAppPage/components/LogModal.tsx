import { LoadingIcon } from "@/components/bs-icons/loading";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/bs-ui/dialog";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Textarea } from "@/components/bs-ui/input";

export const LogContent = ({ data, setOpen,}) => {
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        //TODO： 这里请求
        console.log('data', data);
        setLoading(false);
    }, [])


    return <div className="relative">
        {
            loading && <div className="absolute w-full h-full top-0 left-0 flex justify-center items-center z-10 bg-[rgba(255,255,255,0.6)] dark:bg-blur-shared">
                <LoadingIcon />
            </div>
        }
        <Textarea
            disabled
            value={'123/\r23'}
            className="min-h-80 mt-1"
        />
    </div>
};


const LogModal = forwardRef((props, ref) => {
    // labels

    const [open, setOpen] = useState(false)
    const [data, setData] = useState<any>({})
    useImperativeHandle(ref, () => ({
        openModal: (data) => {
            setOpen(true)
            setData(data)
        }
    }));


    return <Dialog open={open} onOpenChange={setOpen} >
        <DialogContent className="min-w-[50%]">
            <DialogHeader>
                <DialogTitle>{'查看日志'}</DialogTitle>
            </DialogHeader>
            {open && <LogContent data={data} setOpen={setOpen} />}
        </DialogContent>
    </Dialog>
});

export default LogModal
