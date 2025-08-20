import Separator from "@/components/bs-comp/chatComponent/Separator";
import { Button } from "@/components/bs-ui/button";
import { getSSOurlApi } from "@/controllers/API/pro";
import { useEffect, useState } from "react";
//@ts-ignore
import Wxpro from "./icons/wxpro.svg?react";
import { useTranslation } from "react-i18next";

export default function LoginBridge({ onHasLdap, onlyWx }) {

    const { t } = useTranslation()

    const [ssoUrl, setSsoUrl] = useState<string>('')
    const [wxUrl, setWxUrl] = useState<string>('')
    const [wxList, setWxList] = useState<any[]>([])
    useEffect(() => {
        getSSOurlApi().then((urls: any) => {
            setSsoUrl(urls.sso)
            // setWxUrl(urls.wx ? __APP_ENV__.BASE_URL + urls.wx : '')
            setWxList(urls.wx_list || [])
            urls.ldap && onHasLdap(true)
        })
    }, [])

    if (!ssoUrl && !wxUrl && wxList.length == 0) return null

    return <div>
        <Separator className="my-4" text={t(onlyWx ? 'login.enterpriseWechatLogin' : 'login.otherMethods')}></Separator>
        {onlyWx ? (
          <div className="flex flex-col items-center">
            <div className="flex gap-12 mt-2">
              {wxList.map((wx, index) => (
                <div className="flex flex-col items-center gap-2">
                    <Button
                    key={index}
                    size="xm"
                    variant="ghost"
                    title={wx.name}
                    onClick={() => (location.href = __APP_ENV__.BASE_URL + wx.url)}
                    >
                        <Wxpro />
                    </Button>
                    <p className="mt-2 text-sm text-gray-500 text-center">{wx.name}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-400 text-center mt-8">请选择要登录的企业微信</p>
          </div>
        ) : (
          <div className="flex justify-center items-center gap-4">
            {wxList.map((wx, index) => (
              <Button
                key={index}
                size="icon"
                variant="ghost"
                title={wx.name}
                onClick={() => (location.href = __APP_ENV__.BASE_URL + wx.url)}
              >
                <Wxpro />
              </Button>
            ))}
          </div>
        )}
    </div>
};
