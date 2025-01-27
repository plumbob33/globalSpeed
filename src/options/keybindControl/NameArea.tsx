
import { TargetFx, AdjustMode, Command, Keybind, Duration, ReferenceValues, Trigger } from "../../types"
import { produce, Draft } from "immer"
import { Tooltip } from "../../comps/Tooltip"
import { filterInfos, FilterName, filterTargets } from "../../defaults/filters"
import { GoCode, GoRepoForked, GoHistory } from "react-icons/go"
import { FaPowerOff, FaPause, FaEquals, FaBookmark, FaLink, FaVolumeUp, FaVolumeMute, FaBackward, FaForward, FaArrowRight, FaExchangeAlt, FaPlus, FaMusic, FaList, FaStar, FaInfoCircle, FaMousePointer } from "react-icons/fa"
import { BsFillBrushFill } from "react-icons/bs"
import { TbArrowsHorizontal } from "react-icons/tb"
import { GiAnticlockwiseRotation, GiJumpAcross } from "react-icons/gi"
import { BsMusicNoteList } from "react-icons/bs"
import { TiArrowLoop } from "react-icons/ti"
import { MdDarkMode, MdFullscreen, MdPictureInPictureAlt, MdWarning } from "react-icons/md"
import { assertType, domRectGetOffset, feedbackText, getPopupSize } from "../../utils/helper"
import { MenuProps } from "../../comps/Menu"
import { replaceArgs } from "src/utils/gsm"
import { MdSpeed } from "react-icons/md";
import { Gear, Pin, Zap } from "src/comps/svgs"
import { KeybindControlProps } from "."
import { FaRegWindowRestore } from "react-icons/fa6"
import { KebabList, KebabListProps } from "../KebabList"
import { isSeekSmall } from "src/utils/configUtils"
import { PiArrowArcRightFill } from "react-icons/pi"
import { NumericInput } from "src/comps/NumericInput"

const invertableKeys = new Set(["fastSeek", "autoPause", "skipPauseSmall", "pauseWhileScrubbing", "relativeToSpeed", "wraparound", "itcWraparound", "showNetDuration", "seekOnce", "allowAlt", "noWrap", "noHold"])
const memMap = new Map<string, any>()

function saveToMem(kb: Keybind, adjustMode: AdjustMode) {
    memMap.set(`${kb.id}:${adjustMode}:${kb.duration}:${kb.filterOption}`, {
        valueNumber: kb.valueNumber,
        valueItcMin: kb.valueItcMin,
        valueItcMax: kb.valueItcMax,
        valueCycle: kb.valueCycle
    })
}

function restoreFromMem(kb: Draft<Keybind>, adjustMode: AdjustMode, clearBase?: boolean) {
    const cached = memMap.get(`${kb.id}:${adjustMode}:${kb.duration}:${kb.filterOption}`)
    if (clearBase) {
        delete kb.valueNumber 
        delete kb.valueItcMin
        delete kb.valueItcMax
        delete kb.valueCycle

    }
    if (!cached) return 
    Object.assign(kb, cached)
    return true 
}

type NameAreaProps = {
    command: Command,
    onChange: KeybindControlProps["onChange"],
    value: KeybindControlProps["value"]
    hasSpecial: boolean
    reference: ReferenceValues
}

export function NameArea(props: NameAreaProps) {
    const { command, value, hasSpecial } = props

    const kebabList: KebabListProps["list"] = []
    const kebabListHandlers: KebabListProps["onSelect"][] = []

    let label = (gvar.gsm.command as any)[value.command]
    let tooltip = (gvar.gsm.command as any)[value.command.concat("Tooltip")]
    let tabCaptureWarning = command.requiresTabCapture && !(value.command === "afxCapture" || value.command === "afxReset") && (value.trigger || Trigger.LOCAL) === Trigger.LOCAL
    let adjustMode = command.valueType === "adjustMode" ? (value.adjustMode || AdjustMode.SET) : null 
    let showNumeric = adjustMode !== AdjustMode.ITC && adjustMode !== AdjustMode.CYCLE

    if (hasSpecial) label = "special"

    const invertFlag = (key: string) => {
        assertType<keyof Keybind>(key)
        props.onChange(value.id, produce(value, d => {
            (d as any)[key] = !d[key]
            if (!d[key]) delete d[key]
        }))
    }

    value.command === "seek" && ensureSeekList(kebabList, kebabListHandlers, value, invertFlag, props.reference)
    ;(value.adjustMode === AdjustMode.ITC || value.adjustMode === AdjustMode.ITC_REL) && ensureItcList(kebabList, kebabListHandlers, value, invertFlag)
    value.adjustMode === AdjustMode.CYCLE && ensureCycleList(kebabList, kebabListHandlers, value, invertFlag)

    return (
        <div className="command">

            {/* Icons */}
            {value.command === "speed" && <MdSpeed className="tr120" />}
            {value.command === "speedChangesPitch" && <BsMusicNoteList className="tr103" />}
            {value.command === "runCode" && <GoCode strokeWidth="1px" className="tr105" />}
            {value.command === "openUrl" && <FaLink />}
            {value.command === "intoPopup" && <FaRegWindowRestore/>}
            {value.command === "pin" && <Pin className="tr105" />}
            {value.command === "fxFilter" && <Zap className="tr130" />}
            {value.command === "fxState" && <FaPowerOff className="hoverYes tr110" />}
            {(value.command === "fxReset" || value.command === "afxReset") && <GiAnticlockwiseRotation className="hoverYes tr110" />}
            {value.command === "fxSwap" && <FaExchangeAlt className="hoverYes tr110" />}
            {value.command === "pause" && <FaPause className="tr95" />}
            {value.command === "mute" && <FaVolumeMute className="tr105" />}
            {value.command === "volume" && <FaVolumeUp className="tr105" />}
            {value.command === "PiP" && <MdPictureInPictureAlt className="tr105" />}
            {value.command === "cinema" && <MdDarkMode/>}
            {value.command === "fullscreen" && <MdFullscreen className="tr140" />}
            {value.command === "mediaInfo" && <FaInfoCircle className="tr9" />}
            {value.command === "afxGain" && <FaVolumeUp className="tr105" />}
            {value.command === "afxPitch" && <FaMusic />}
            {value.command === "state" && <FaPowerOff />}
            {(value.command === "setMark" && !hasSpecial) && <FaBookmark className="tr95" />}
            {hasSpecial && <FaStar />}
            {value.command === "seekMark" && <FaArrowRight className="tr95" />}
            {value.command === "loop" && <TiArrowLoop className="tr140" />}
            {value.command === "skip" && <PiArrowArcRightFill />}

            {/* FaRightArrowLeft */}
            {value.command === "seek" && (
                (adjustMode === AdjustMode.ADD || adjustMode === AdjustMode.ITC_REL) && value.valueNumber < 0 ? (
                    <FaBackward className="tr95" />
                ) : <FaForward className="tr95" />
            )}
            {value.command === "afxPan" && <TbArrowsHorizontal className="tr120" />}
            {value.command === "afxMono" && <GoRepoForked className="tr120" />}
            {value.command === "afxDelay" && <GoHistory strokeWidth="1px" className="tr115" />}
            {value.command === "afxCapture" && <div className={`captureIcon ${value.enabled ? "active" : ""}`}><div></div></div>}

            {value.command === "drawPage" && <BsFillBrushFill />}

            {/* Label */}
            <span>{label}</span>

            {/* Capture shortcut warning */}
            {tabCaptureWarning && <Tooltip labelAlt={
                <MdWarning size="1.35rem" style={{ color: "#ff8888" }} />
            } tooltip={replaceArgs(gvar.gsm.warnings.captureRequired, [`[ ${gvar.gsm.command.afxCapture} ]`])} />}

            {/* cycle adjustMode */}
            {command.valueType === "adjustMode" && <button className="adjustMode" onClick={e => {

                props.onChange(value.id, produce(value, d => {
                    saveToMem(value, adjustMode)
                    d.adjustMode = adjustMode % 5 + 1
                    restoreFromMem(d, d.adjustMode, true)
                    feedbackText(gvar.gsm.options.editor.adjustModes[d.adjustMode], domRectGetOffset((e.currentTarget as HTMLButtonElement).getBoundingClientRect(), 40, 40, true))
                }))
            }}>
                {(value.adjustMode || AdjustMode.SET) === AdjustMode.SET && <FaEquals size="1em" />}
                {value.adjustMode === AdjustMode.ADD && <FaPlus size="1em" />}
                {value.adjustMode === AdjustMode.CYCLE && <FaList size="1em" />}
                {value.adjustMode === AdjustMode.ITC && <>
                    <FaMousePointer size="1em"/>
                    <FaEquals size="1em" />
                </>}
                {value.adjustMode === AdjustMode.ITC_REL && <>
                    <FaMousePointer size="1em"/>
                    <FaPlus size="1em" />
                </>}
            </button>}

            {/* Tooltip */}
            {tooltip && <Tooltip label="?" tooltip={tooltip} />}


            {value.command === "cinema" && <Cinema value={value} onChange={props.onChange}/>}

            {/* Fullscreen: native */}
            {value.command === "fullscreen" && <>
                <button style={{ marginLeft: "10px", padding: '2px 5px' }} className={`toggle ${value.direct ? "active" : ""}`} onClick={e => {
                    props.onChange(value.id, produce(value, d => {
                        d.direct = !d.direct
                    }))
                }}>{gvar.gsm.command.nativeTooltip}</button>
            </>}

            {/* Filter stuff */}
            <FilterSelect value={value} command={command} onChange={props.onChange} adjustMode={adjustMode}/>

            {/* Duration  */}
            {command.withDuration && !showNumeric && <DurationSelect value={value} onChange={props.onChange} adjustMode={adjustMode}/>}

            {/* Kebab menu  */}
            {!!kebabList.length && <KebabList list={kebabList} onSelect={name => {
                for (let handler of kebabListHandlers) {
                    if (handler(name)) return 
                } 
            }}/>}

            {/* URL mode */}
            <UrlMode value={value} onChange={props.onChange} />
            {value.command === "intoPopup" && (
                <button className="icon gear interactive" onClick={() => {
                    chrome.windows.create({url: chrome.runtime.getURL(`placer.html?id=${value.id}`), type: "popup", ...(value.valuePopupRect ?? getPopupSize())})
                }}>
                    <Gear size="1.57rem"/>
                </button>
            )}
        </div>
    )
}


function ensureSeekList(list: KebabListProps["list"], handlers: KebabListProps["onSelect"][], value: KeybindControlProps["value"], invertFlag: (key: string) => any, reference?: ReferenceValues) {
    let adjustMode = value.adjustMode || AdjustMode.SET

    HTMLMediaElement.prototype.fastSeek && list.push(
        { name: "fastSeek", checked: !!value.fastSeek, label: makeLabelWithTooltip(gvar.gsm.command.fastSeek, gvar.gsm.command.fastSeekTooltip) },
    )

    const pauseNormal = { name: "autoPause", label: gvar.gsm.command.pause, checked: !!value.autoPause } as MenuProps["items"][number]
    const pauseSmall = { name: "skipPauseSmall", label: gvar.gsm.command.pause, checked: !value.skipPauseSmall } as MenuProps["items"][number]

    if (adjustMode === AdjustMode.ITC_REL || adjustMode === AdjustMode.ITC) {
        list.push(
            { name: "pauseWhileScrubbing", label: gvar.gsm.options.editor.pauseWhileScrubbing, checked: value.pauseWhileScrubbing } as MenuProps["items"][number]
        )
    } else {
        list.push(isSeekSmall(value, reference) ? pauseSmall : pauseNormal)
    }

    if (adjustMode === AdjustMode.ADD || adjustMode === AdjustMode.ITC_REL) {
        list.push(
            { name: "relativeToSpeed", checked: !!value.relativeToSpeed, label: gvar.gsm.command.relativeToSpeed }
        )
        
        adjustMode === AdjustMode.ADD && list.push(
            { name: "wraparound", checked: value.wraparound, label: makeLabelWithTooltip(gvar.gsm.options.editor.wraparound, gvar.gsm.options.editor.wraparoundTooltip) },
            { name: "showNetDuration", checked: !!value.showNetDuration, label: gvar.gsm.command.showNet }
        )

        adjustMode === AdjustMode.ITC_REL && list.push(
            { name: "itcWraparound", checked: value.itcWraparound, label: makeLabelWithTooltip(gvar.gsm.options.editor.wraparound, gvar.gsm.options.editor.wraparoundTooltip) },
        )
    }
    
    handlers.push((name: string) => {
        if (invertableKeys.has(name)) {
            invertFlag(name as keyof Keybind)
            return true 
        }
    })
}

function ensureItcList(list: KebabListProps["list"], handlers: KebabListProps["onSelect"][], value: KeybindControlProps["value"], invertFlag: (key: string) => any) {
    let relative = value.adjustMode === AdjustMode.ITC_REL

    list.push({name: "seekOnce", label: makeLabelWithTooltip(gvar.gsm.options.editor.liveScrubbing, gvar.gsm.options.editor.liveScrubbingTooltip), checked: !value.seekOnce})
    if ((value.trigger || Trigger.LOCAL) === Trigger.LOCAL) {
        list.push({name: "noHold", label: makeLabelWithTooltip(gvar.gsm.options.editor.pressAndHold, gvar.gsm.options.editor.pressAndHoldTooltip), checked: !value.noHold})
    }

    handlers.push((name: string) => {
        if (invertableKeys.has(name)) {
            invertFlag(name as keyof Keybind)
            return true 
        }
    })
}

function ensureCycleList(list: KebabListProps["list"], handlers: KebabListProps["onSelect"][], value: KeybindControlProps["value"], invertFlag: (key: string) => any) {
    list.push(
        { name: "allowAlt", checked: value.allowAlt, label: makeLabelWithTooltip(gvar.gsm.options.editor.reversible, gvar.gsm.options.editor.reversibleTooltip) }
    )
    value.allowAlt && list.push(
        { name: "noWrap", checked: !value.cycleNoWrap, label: makeLabelWithTooltip(gvar.gsm.options.editor.wraparound, gvar.gsm.options.editor.wraparoundTooltip) }
    )

    handlers.push((name: string) => {
        if (invertableKeys.has(name)) {
            invertFlag(name as keyof Keybind)
            return true 
        }
    })
}

export function makeLabelWithTooltip(name: string, tooltip: string) {
    return <>{name}<Tooltip noHover={true} alert={true} pass={{ style: { paddingLeft: "10px" } }} tooltip={tooltip}/></>
}

type FilterSelectProps = {
    command: Command,
    onChange: KeybindControlProps["onChange"],
    value: KeybindControlProps["value"],
    adjustMode: AdjustMode,
}

function FilterSelect(props: FilterSelectProps) {
    const { value, command, onChange } = props
    if (command.withFilterTarget || command.withFilterOption) {
        return (
            <div className="support">
                {command.withFilterTarget && (
                    <select
                        className="padded"
                        value={value.filterTarget}
                        onChange={e => {
                            onChange(value.id, produce(value, d => {
                                d.filterTarget = e.target.value as TargetFx
                            }))
                        }}
                    >{filterTargets.map(v => {
                        return <option key={v} value={v}>{(gvar.gsm.token as any)[v]}</option>
                    })}</select>
                )}
                {command.withFilterOption && (
                    <select
                        className="padded"
                        value={value.filterOption}
                        onChange={e => {
                            props.onChange(value.id, produce(value, d => {
                                saveToMem(value, props.adjustMode)
                                d.filterOption = e.target.value as FilterName
                                restoreFromMem(d, props.adjustMode, true)
                            }))
                        }}
                    >{Object.entries(filterInfos).map(([k, v]) => {
                        return <option key={k} value={k}>{gvar.gsm.filter[k as FilterName] || ""}</option>
                    })}</select>
                )}
            </div>
        )
    }
}

type UrlModeProps = {
    onChange: KeybindControlProps["onChange"],
    value: KeybindControlProps["value"]
}

function UrlMode(props: UrlModeProps) {
    const { value, onChange } = props

    return <>
        {value.command === "openUrl" && <select value={value.valueUrlMode || "fgTab"} onChange={e => {
            onChange(value.id, produce(value, d => {
                d.valueUrlMode = e.target.value as any
                if (d.valueUrlMode === "fgTab") delete d.valueUrlMode
                let isPopup = d.valueUrlMode === "newPopup"
                if (isPopup || d.valueUrlMode === "newWindow") {
                    chrome.windows.create({url: chrome.runtime.getURL(`placer.html?id=${value.id}`), type: isPopup ? "popup" : "normal", ...getPopupSize()})
                }
            }))
        }}>
            <option value="fgTab">{gvar.gsm.options.editor.openModes.foregroundTab}</option>
            <option value="bgTab">{gvar.gsm.options.editor.openModes.backgroundTab}</option>
            <option value="sameTab">{gvar.gsm.options.editor.openModes.sameTab}</option>
            <option value="newWindow">{gvar.gsm.options.editor.openModes.newWindow}</option>
            <option value="newPopup">{gvar.gsm.options.editor.openModes.newPopup}</option>
        </select>}
    </>
}


type DurationSelectProps = {
    onChange: KeybindControlProps["onChange"],
    value: KeybindControlProps["value"],
    adjustMode: AdjustMode
}

export function DurationSelect(props: DurationSelectProps) {
    const { value, onChange } = props

    return <>
        <select className="padded" value={value.duration || Duration.SECS} onChange={e => {
            onChange(value.id, produce(value, d => {
                saveToMem(value, props.adjustMode)

                d.duration = parseInt(e.target.value)
                if (d.duration === Duration.SECS) {
                    delete d.duration
                }
                restoreFromMem(d, props.adjustMode, true)
            }))
        }}>
            <option value={Duration.SECS}>{gvar.gsm.token.seconds}</option>
            <option value={Duration.PERCENT}>{gvar.gsm.token.percent}</option>
            <option value={Duration.FRAMES}>{gvar.gsm.token.frames}</option>
        </select>
    </>
}

function Cinema(props: {
    value: Keybind,
    onChange: (id: string, v: Keybind) => void
}) {
    const { value } = props 
    return <>
        <input type="color" value={value.valueString || "#000000"} onChange={e => {
            props.onChange(value.id, produce(value, d => {
                d.valueString = e.target.value || null
            }))
        }}/>
        <NumericInput onFocus={e => {
            feedbackText(gvar.gsm.filter.opacity, domRectGetOffset((e.currentTarget as HTMLInputElement).getBoundingClientRect(), 20, -50, true))
        }} className="cinamaInput" placeholder={"90"} min={5} max={100} value={value.valueNumber} onChange={v => {
            props.onChange(value.id, produce(value, d => {
                d.valueNumber = v 
            }))
        }}/>
        <NumericInput onFocus={e => {
            feedbackText(gvar.gsm.token.rounding, domRectGetOffset((e.currentTarget as HTMLInputElement).getBoundingClientRect(), 20, -50, true))
        }}  className="cinamaInput" placeholder={"10"} min={0} value={value.valueNumberAlt} onChange={v => {
            props.onChange(value.id, produce(value, d => {
                d.valueNumberAlt = v 
            }))
        }}/>
    </>
}

