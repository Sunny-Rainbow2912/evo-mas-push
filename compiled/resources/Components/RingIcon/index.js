"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_restore_1 = __importDefault(require("react-restore"));
const svg_1 = __importDefault(require("../../../resources/svg"));
const Icon = ({ svgName, alt = '', svgSize = 16, img, small }) => {
    if (img) {
        return <img src={`https://proxy.pylon.link?type=icon&target=${encodeURIComponent(img)}`} alt={alt}/>;
    }
    if (svgName) {
        const iconName = svgName.toLowerCase();
        const ethChains = ['mainnet', 'görli', 'sepolia', 'ropsten', 'rinkeby', 'kovan'];
        if (ethChains.includes(iconName)) {
            return svg_1.default.eth(small ? 13 : 18);
        }
        const svgIcon = svg_1.default[iconName];
        return svgIcon ? svgIcon(svgSize) : null;
    }
    return svg_1.default.eth(small ? 13 : 18);
};
class RingIcon extends react_1.default.Component {
    constructor(...args) {
        super(...args);
        this.state = {};
    }
    render() {
        const { color, svgName, svgSize, img, small, block, noRing, alt } = this.props;
        let ringIconClass = 'ringIcon';
        if (small)
            ringIconClass += ' ringIconSmall';
        if (block)
            ringIconClass += ' ringIconBlock';
        if (noRing)
            ringIconClass += ' ringIconNoRing';
        return (<div className={ringIconClass} style={{
                borderColor: color
            }}>
        <div className='ringIconInner' style={block ? { color } : { background: color }}>
          <Icon svgName={svgName} svgSize={svgSize} img={img} alt={alt} small={small}/>
        </div>
      </div>);
    }
}
exports.default = react_restore_1.default.connect(RingIcon);
