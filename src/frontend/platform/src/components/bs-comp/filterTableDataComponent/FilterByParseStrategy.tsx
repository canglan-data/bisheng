
import { useRef, useState } from "react";
import MultiSelect from "@/components/bs-ui/select/multi";
import { getUsersApiForUser } from "@/controllers/API/user";
import { getParseStrategyList } from "@/controllers/API";

export default function FilterByParseStrategy({ value, onChange }) {
    const { parseStrategys, loadParseStrategys, searchParseStrategys, loadMoreParseStrategys } = useParseStrategys();

    return (
        <div className="relative">
            <MultiSelect
                contentClassName="overflow-y-auto"
                options={parseStrategys}
                value={value}
                placeholder="知识库解析策略"
                onLoad={loadParseStrategys}
                onSearch={searchParseStrategys}
                onScrollLoad={loadMoreParseStrategys}
                onChange={onChange}
            />
        </div>
    );
}

const useParseStrategys = () => {
    const [parseStrategys, setparseStrategys] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const hasMoreRef = useRef(true);
    const loadLock = useRef(false); // Prevent multiple simultaneous requests
    const keyWordRef = useRef("");

    // Load users from the API and store in state
    const loadParseStrategys = async (name: string) => {
        try {
            const res = await getParseStrategyList({ name, page: 1, pageSize: 50 });
            const options = res.data.map((u: any) => ({
                label: <div>{u.name}
                    {!!u.is_default && <label className="text-xm bg-[#E0E7F7] text-primary inline-block pl-1 pr-1 ml-2">默认</label>}
                </div>,
                value: u.id,
            }));
            keyWordRef.current = name;
            setparseStrategys(options);
            setPage(1);
            hasMoreRef.current = 50 < res.total;

            setTimeout(() => {
                loadLock.current = false;
            }, 500);
        } catch (error) {
            console.error("Error loading users:", error);
            // Optionally, you can set users to an empty array or show an error message
        }
    };

    // Load more apps when scrolling
    const loadMoreParseStrategys = async () => {
        if (!hasMoreRef.current) return;
        if (loadLock.current) return;
        try {
            const nextPage = page + 1;
            const res = await getParseStrategyList({ name: keyWordRef.current, page: nextPage, pageSize: 50 });
            const options = res.data.map((u: any) => ({
                label: <div>{u.name}
                    {!!u.is_default && <label className="text-xm bg-[#E0E7F7] text-primary inline-block pl-1 pr-1 ml-2">默认</label>}
                </div>,
                value: a.id,
            }));
            setparseStrategys((prevApps) => [...prevApps, ...options]);
            setPage(nextPage);
            hasMoreRef.current = nextPage * 50 < res.total;
        } catch (error) {
            console.error("Error loading more apps:", error);
        }
    };

    return {
        parseStrategys,
        loadParseStrategys,
        searchParseStrategys: loadParseStrategys,
        loadMoreParseStrategys
    };
};
